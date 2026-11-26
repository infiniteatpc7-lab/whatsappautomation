<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CampaignStatus;
use App\Enums\OptInStatus;
use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Enums\WhatsAppConnectionType;
use App\Enums\WorkspaceRole;
use App\Models\Campaign;
use App\Models\Contact;
use App\Models\Tag;
use App\Models\Template;
use App\Models\User;
use App\Models\WhatsAppAccount;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class BroadcastTest extends TestCase
{
    use RefreshDatabase;

    protected function createWorkspaceWithAccount(string $name = 'Acme Corp', string $email = 'test@example.com'): array
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt('Secret1234!'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $workspace = Workspace::create([
            'owner_id' => $user->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(6),
            'timezone' => 'Asia/Kolkata',
        ]);

        $workspace->users()->attach($user->id, [
            'role' => WorkspaceRole::OWNER->value,
            'is_available' => true,
        ]);

        $user->forceFill(['current_workspace_id' => $workspace->id])->save();

        $account = WhatsAppAccount::create([
            'workspace_id' => $workspace->id,
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'waba_id' => 'waba_test_'.Str::random(6),
            'phone_number_id' => 'pn_test_'.Str::random(6),
            'display_phone_number' => '+91 99999 00001',
            'verified_name' => $name,
            'access_token' => 'EAA_TEST_TOKEN_12345678901234567890',
            'webhook_verify_token' => 'verify_token_'.Str::random(8),
            'messaging_limit_tier' => 'TIER_250',
            'status' => WhatsAppAccountStatus::CONNECTED,
            'last_synced_at' => now(),
        ]);

        return [$workspace, $user, $account];
    }

    public function test_broadcasts_index_renders_with_quota(): void
    {
        [, $user] = $this->createWorkspaceWithAccount();

        $response = $this->actingAs($user)->get('/dashboard/broadcasts');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard/Broadcasts/Index')
            ->where('hasConnectedAccount', true)
            ->where('quota.daily_limit', 250)
        );
    }

    public function test_launch_broadcast_excludes_opted_out_contacts_and_dispatches_messages(): void
    {
        [$workspace, $user, $account] = $this->createWorkspaceWithAccount();

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_tpl_1',
            'name' => 'promo_offer',
            'language' => 'en_US',
            'category' => TemplateCategory::MARKETING,
            'status' => TemplateStatus::APPROVED,
            'header_type' => 'NONE',
            'body_text' => 'Hello {{1}}, special offer today!',
            'components' => [['type' => 'BODY', 'text' => 'Hello {{1}}, special offer today!']],
        ]);

        $tag = Tag::create(['workspace_id' => $workspace->id, 'name' => 'VIP', 'color' => 'emerald']);

        $c1 = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'name' => 'Rahul',
            'opt_in_status' => OptInStatus::OPTED_IN,
        ]);
        $c1->tags()->attach($tag->id);

        $c2 = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543211',
            'name' => 'Opted Out User',
            'opt_in_status' => OptInStatus::OPTED_OUT,
        ]);
        $c2->tags()->attach($tag->id);

        Http::fake([
            'https://graph.facebook.com/*' => Http::response([
                'messaging_product' => 'whatsapp',
                'messages' => [['id' => 'wamid.test.123']],
            ], 200),
        ]);

        $response = $this->actingAs($user)->postJson('/dashboard/broadcasts', [
            'name' => 'VIP Offer Blast',
            'template_id' => $template->id,
            'audience_type' => 'tags',
            'tag_ids' => [$tag->id],
            'variable_mapping' => [
                '1' => ['source' => 'contact_name', 'fallback' => 'Customer'],
            ],
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'campaign' => [
                'name' => 'VIP Offer Blast',
                'total_recipients' => 1,
            ],
        ]);

        $this->assertDatabaseHas('campaigns', [
            'workspace_id' => $workspace->id,
            'name' => 'VIP Offer Blast',
            'total_recipients' => 1,
            'sent_count' => 1,
            'status' => CampaignStatus::COMPLETED->value,
        ]);
    }

    public function test_unapproved_template_cannot_be_broadcast(): void
    {
        [$workspace, $user, $account] = $this->createWorkspaceWithAccount();

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_tpl_pending',
            'name' => 'pending_tpl',
            'language' => 'en_US',
            'category' => TemplateCategory::UTILITY,
            'status' => TemplateStatus::PENDING,
            'header_type' => 'NONE',
            'body_text' => 'Pending body.',
            'components' => [['type' => 'BODY', 'text' => 'Pending body.']],
        ]);

        Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'name' => 'Rahul',
            'opt_in_status' => OptInStatus::OPTED_IN,
        ]);

        $this->actingAs($user)
            ->postJson('/dashboard/broadcasts', [
                'name' => 'Invalid Blast',
                'template_id' => $template->id,
                'audience_type' => 'all_opted_in',
            ])
            ->assertStatus(422);
    }

    public function test_other_workspace_cannot_access_or_control_campaign(): void
    {
        [$workspaceA, , $accountA] = $this->createWorkspaceWithAccount('Acme A', 'a@example.com');
        $templateA = Template::create([
            'workspace_id' => $workspaceA->id,
            'whatsapp_account_id' => $accountA->id,
            'meta_template_id' => 'meta_tpl_a',
            'name' => 'tpl_a',
            'language' => 'en_US',
            'category' => TemplateCategory::UTILITY,
            'status' => TemplateStatus::APPROVED,
            'header_type' => 'NONE',
            'body_text' => 'Hello',
            'components' => [['type' => 'BODY', 'text' => 'Hello']],
        ]);

        $campaignA = Campaign::create([
            'workspace_id' => $workspaceA->id,
            'whatsapp_account_id' => $accountA->id,
            'template_id' => $templateA->id,
            'name' => 'Campaign A',
            'status' => CampaignStatus::PROCESSING,
            'total_recipients' => 1,
        ]);

        [, $userB] = $this->createWorkspaceWithAccount('Beta B', 'b@example.com');

        $this->actingAs($userB)->get("/dashboard/broadcasts/{$campaignA->id}")->assertStatus(404);
        $this->actingAs($userB)->postJson("/dashboard/broadcasts/{$campaignA->id}/pause")->assertStatus(404);
        $this->actingAs($userB)->postJson("/dashboard/broadcasts/{$campaignA->id}/cancel")->assertStatus(404);
    }

    public function test_smart_sender_schedules_retry_for_retryable_meta_error_131049(): void
    {
        [$workspace, $user, $account] = $this->createWorkspaceWithAccount();

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_tpl_smart',
            'name' => 'smart_tpl',
            'language' => 'en_US',
            'category' => TemplateCategory::MARKETING,
            'status' => TemplateStatus::APPROVED,
            'header_type' => 'NONE',
            'body_text' => 'Hi {{1}}, check this out!',
            'components' => [['type' => 'BODY', 'text' => 'Hi {{1}}, check this out!']],
        ]);

        Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'name' => 'Rahul',
            'opt_in_status' => OptInStatus::OPTED_IN,
        ]);

        Http::fake([
            'https://graph.facebook.com/*' => Http::response([
                'error' => [
                    'message' => 'This message was not delivered to maintain healthy ecosystem engagement.',
                    'type' => 'OAuthException',
                    'code' => 131049,
                ],
            ], 400),
        ]);

        \Illuminate\Support\Facades\Queue::fake();

        $response = $this->actingAs($user)->postJson('/dashboard/broadcasts', [
            'name' => 'Smart Sender Test',
            'template_id' => $template->id,
            'audience_type' => 'all_opted_in',
            'smart_sender_enabled' => true,
            'retry_window_hours' => 36,
        ]);

        $response->assertStatus(201);

        $campaign = Campaign::where('name', 'Smart Sender Test')->firstOrFail();
        $this->assertTrue($campaign->smart_sender_enabled);
        $this->assertSame(36, $campaign->retry_window_hours);

        $recipient = $campaign->recipients()->firstOrFail();
        $scheduled = $recipient->scheduleSmartRetry('131049');
        $this->assertTrue($scheduled);
        $this->assertSame(1, $recipient->fresh()->retry_count);
    }

    public function test_launch_broadcast_with_direct_csv_rows_creates_and_dispatches(): void
    {
        [$workspace, $user, $account] = $this->createWorkspaceWithAccount();

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_tpl_csv',
            'name' => 'csv_tpl',
            'language' => 'en_US',
            'category' => TemplateCategory::MARKETING,
            'status' => TemplateStatus::APPROVED,
            'header_type' => 'NONE',
            'body_text' => 'Hello {{1}}, welcome!',
            'components' => [['type' => 'BODY', 'text' => 'Hello {{1}}, welcome!']],
        ]);

        Http::fake([
            'https://graph.facebook.com/*' => Http::response([
                'messaging_product' => 'whatsapp',
                'messages' => [['id' => 'wamid.csv.1']],
            ], 200),
        ]);

        $response = $this->actingAs($user)->postJson('/dashboard/broadcasts', [
            'name' => 'Direct CSV Blast',
            'template_id' => $template->id,
            'audience_type' => 'csv',
            'csv_rows' => [
                [
                    'phone' => '9876543210',
                    'name' => 'CSV User',
                    'city' => 'Surat',
                    'custom_fields' => ['order_id' => 'ORD-999'],
                ],
                ['phone' => '123', 'name' => 'Invalid'],
            ],
            'variable_mapping' => [
                '1' => ['source' => 'csv:order_id', 'fallback' => 'N/A'],
            ],
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'campaign' => [
                'name' => 'Direct CSV Blast',
                'total_recipients' => 1,
            ],
        ]);

        $this->assertDatabaseHas('contacts', [
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'name' => 'CSV User',
            'source' => 'broadcast_csv',
        ]);

        $this->assertDatabaseHas('messages', [
            'workspace_id' => $workspace->id,
            'body' => 'Hello ORD-999, welcome!',
        ]);
    }

    public function test_tracked_broadcast_link_increments_clicks_and_redirects(): void
    {
        [$workspace, , $account] = $this->createWorkspaceWithAccount('Click Corp', 'click@example.com');

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_tpl_clk',
            'name' => 'clk_tpl',
            'language' => 'en_US',
            'category' => TemplateCategory::MARKETING,
            'status' => TemplateStatus::APPROVED,
            'header_type' => 'NONE',
            'body_text' => 'Visit our site!',
            'components' => [['type' => 'BODY', 'text' => 'Visit our site!']],
        ]);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543219',
            'name' => 'Click User',
            'opt_in_status' => OptInStatus::OPTED_IN,
        ]);

        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'template_id' => $template->id,
            'name' => 'Click Campaign',
            'status' => CampaignStatus::COMPLETED,
            'total_recipients' => 1,
        ]);

        $recipient = $campaign->recipients()->create([
            'contact_id' => $contact->id,
            'status' => \App\Enums\RecipientStatus::DELIVERED,
        ]);

        $link = \App\Models\CampaignLink::create([
            'campaign_id' => $campaign->id,
            'campaign_recipient_id' => $recipient->id,
            'token' => 'testclk123',
            'target_url' => 'https://example.com/offer',
        ]);

        $response = $this->get("/r/{$link->token}");

        $response->assertRedirect('https://example.com/offer');
        $this->assertSame(1, $campaign->fresh()->clicks_count);
        $this->assertNotNull($recipient->fresh()->clicked_at);
    }
}
