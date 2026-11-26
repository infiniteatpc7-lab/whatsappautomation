<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CampaignStatus;
use App\Enums\MessageDirection;
use App\Enums\MessageSenderType;
use App\Enums\MessageStatus;
use App\Enums\MessageType;
use App\Enums\OptInStatus;
use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Enums\WhatsAppConnectionType;
use App\Enums\WorkspaceRole;
use App\Models\Campaign;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Template;
use App\Models\User;
use App\Models\WhatsAppAccount;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_overview_renders_live_workspace_metrics(): void
    {
        $user = User::create([
            'name' => 'Test Owner',
            'email' => 'owner@example.com',
            'password' => bcrypt('Secret1234!'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $workspace = Workspace::create([
            'owner_id' => $user->id,
            'name' => 'Acme',
            'slug' => 'acme-'.Str::random(6),
            'timezone' => 'Asia/Kolkata',
        ]);
        $workspace->users()->attach($user->id, ['role' => WorkspaceRole::OWNER->value, 'is_available' => true]);
        $user->forceFill(['current_workspace_id' => $workspace->id])->save();

        $account = WhatsAppAccount::create([
            'workspace_id' => $workspace->id,
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'waba_id' => 'waba_ov_1',
            'phone_number_id' => 'pn_ov_1',
            'display_phone_number' => '+91 99999 00001',
            'verified_name' => 'Acme',
            'access_token' => 'EAA_TEST_TOKEN_12345678901234567890',
            'webhook_verify_token' => 'verify_'.Str::random(8),
            'quality_rating' => 'GREEN',
            'health_status' => 'AVAILABLE',
            'messaging_limit_tier' => 'TIER_2K',
            'status' => WhatsAppAccountStatus::CONNECTED,
        ]);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'name' => 'Rahul',
            'opt_in_status' => OptInStatus::OPTED_IN,
        ]);

        $conv = Conversation::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'contact_id' => $contact->id,
            'window_expires_at' => now()->addHours(12),
        ]);

        Message::create([
            'workspace_id' => $workspace->id,
            'conversation_id' => $conv->id,
            'whatsapp_account_id' => $account->id,
            'wamid' => 'wamid.ov.1',
            'direction' => MessageDirection::OUTBOUND,
            'sender_type' => MessageSenderType::AGENT,
            'type' => MessageType::TEXT,
            'body' => 'Hello',
            'status' => MessageStatus::DELIVERED,
            'status_rank' => MessageStatus::DELIVERED->rank(),
        ]);

        $tpl = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_ov_1',
            'name' => 'ov_tpl',
            'language' => 'en_US',
            'category' => TemplateCategory::UTILITY,
            'status' => TemplateStatus::APPROVED,
            'header_type' => 'NONE',
            'body_text' => 'Hi',
            'components' => [['type' => 'BODY', 'text' => 'Hi']],
        ]);

        Campaign::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'template_id' => $tpl->id,
            'name' => 'Launch Blast',
            'status' => CampaignStatus::COMPLETED,
            'total_recipients' => 1,
            'sent_count' => 1,
            'delivered_count' => 1,
        ]);

        $response = $this->actingAs($user)->get('/dashboard/overview');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard/Overview')
            ->where('stats.outbound_30d', 1)
            ->where('stats.delivered_30d', 1)
            ->where('stats.open_windows', 1)
            ->where('stats.opted_in_contacts', 1)
            ->where('stats.daily_limit', 2000)
            ->where('stats.quality_rating', 'GREEN')
            ->where('stats.health_status', 'AVAILABLE')
            ->has('dailyVolume', 7)
            ->has('recentCampaigns', 1)
        );
    }
}
