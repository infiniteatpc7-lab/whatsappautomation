<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Enums\WhatsAppConnectionType;
use App\Enums\WorkspaceRole;
use App\Models\Template;
use App\Models\User;
use App\Models\WhatsAppAccount;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TemplateTest extends TestCase
{
    use RefreshDatabase;

    protected function createWorkspaceWithUser(string $name = 'Acme Corp', string $email = 'test@example.com'): array
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

        return [$workspace, $user];
    }

    protected function createAccount(Workspace $workspace): WhatsAppAccount
    {
        return WhatsAppAccount::create([
            'workspace_id' => $workspace->id,
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'waba_id' => 'waba_test_123',
            'phone_number_id' => 'phone_test_123',
            'display_phone_number' => '+15551234567',
            'verified_name' => 'Acme Support',
            'access_token' => 'meta_access_token_secret',
            'webhook_verify_token' => 'verify_token_123',
            'status' => WhatsAppAccountStatus::CONNECTED,
        ]);
    }

    public function test_unauthenticated_user_cannot_access_templates(): void
    {
        $response = $this->get('/dashboard/templates');
        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_can_view_templates_page_with_locked_state(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();

        $response = $this->actingAs($user)->get('/dashboard/templates');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Templates/Index')
            ->where('hasConnectedAccount', false)
            ->has('initialTemplates', 0)
        );
    }

    public function test_authenticated_user_can_view_create_template_page(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $account = $this->createAccount($workspace);

        $response = $this->actingAs($user)->get('/dashboard/templates/new');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Templates/Create')
            ->where('hasConnectedAccount', true)
            ->where('activeAccount.waba_id', 'waba_test_123')
        );
    }

    public function test_user_can_view_templates_page_when_whatsapp_account_connected(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $account = $this->createAccount($workspace);

        Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_tmpl_101',
            'name' => 'order_confirmation',
            'language' => 'en_US',
            'category' => TemplateCategory::UTILITY,
            'status' => TemplateStatus::APPROVED,
            'body_text' => 'Your order #{{1}} is confirmed.',
            'components' => [
                ['type' => 'BODY', 'text' => 'Your order #{{1}} is confirmed.'],
            ],
            'last_synced_at' => now(),
        ]);

        $response = $this->actingAs($user)->get('/dashboard/templates');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Templates/Index')
            ->where('hasConnectedAccount', true)
            ->has('initialTemplates', 1)
            ->where('initialTemplates.0.name', 'order_confirmation')
            ->where('initialTemplates.0.status', 'APPROVED')
        );
    }

    public function test_user_can_sync_templates_from_meta_successfully(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $account = $this->createAccount($workspace);

        Http::fake([
            'https://graph.facebook.com/*/waba_test_123/message_templates*' => Http::response([
                'data' => [
                    [
                        'id' => 'meta_99999',
                        'name' => 'welcome_offer',
                        'language' => 'en_US',
                        'status' => 'APPROVED',
                        'category' => 'MARKETING',
                        'components' => [
                            ['type' => 'HEADER', 'format' => 'TEXT', 'text' => 'Welcome!'],
                            ['type' => 'BODY', 'text' => 'Use code {{1}} for 20% off.'],
                            ['type' => 'FOOTER', 'text' => 'Terms apply'],
                        ],
                    ],
                    [
                        'id' => 'meta_88888',
                        'name' => 'appointment_reminder',
                        'language' => 'en_US',
                        'status' => 'PENDING',
                        'category' => 'UTILITY',
                        'components' => [
                            ['type' => 'BODY', 'text' => 'Your appointment is tomorrow at {{1}}.'],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($user)->postJson('/dashboard/templates/sync');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'synced_count' => 2,
        ]);

        $this->assertDatabaseHas('templates', [
            'workspace_id' => $workspace->id,
            'name' => 'welcome_offer',
            'status' => TemplateStatus::APPROVED->value,
            'category' => TemplateCategory::MARKETING->value,
        ]);

        $this->assertDatabaseHas('templates', [
            'workspace_id' => $workspace->id,
            'name' => 'appointment_reminder',
            'status' => TemplateStatus::PENDING->value,
            'category' => TemplateCategory::UTILITY->value,
        ]);
    }

    public function test_sync_fails_when_no_whatsapp_account_connected(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();

        $response = $this->actingAs($user)->postJson('/dashboard/templates/sync');

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'No active WhatsApp account connected. Please connect your Meta Cloud API credentials in Workspace settings.',
        ]);
    }

    public function test_user_can_create_template_successfully_with_meta_api(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $this->createAccount($workspace);

        Http::fake([
            'https://graph.facebook.com/*/waba_test_123/message_templates*' => Http::response([
                'id' => 'meta_new_777',
                'status' => 'PENDING',
                'category' => 'MARKETING',
            ], 200),
        ]);

        $payload = [
            'name' => 'summer_promo',
            'category' => 'MARKETING',
            'language' => 'en_US',
            'header_type' => 'TEXT',
            'header_text' => 'Exclusive Deal!',
            'body_text' => 'Hello {{1}}, use coupon code {{2}} to save 20%!',
            'body_examples' => ['Saunak', 'SUMMER20'],
            'footer_text' => 'Terms apply',
            'buttons' => [
                ['type' => 'QUICK_REPLY', 'text' => 'Claim Now'],
                ['type' => 'URL', 'text' => 'Visit Site', 'url' => 'https://example.com/deals'],
            ],
        ];

        $response = $this->actingAs($user)->postJson('/dashboard/templates', $payload);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'template' => [
                'name' => 'summer_promo',
                'category' => 'MARKETING',
                'status' => 'PENDING',
                'meta_template_id' => 'meta_new_777',
            ],
        ]);

        $this->assertDatabaseHas('templates', [
            'workspace_id' => $workspace->id,
            'name' => 'summer_promo',
            'meta_template_id' => 'meta_new_777',
            'category' => TemplateCategory::MARKETING->value,
            'status' => TemplateStatus::PENDING->value,
            'header_type' => 'TEXT',
        ]);
    }

    public function test_create_template_validates_name_format_and_required_fields(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $this->createAccount($workspace);

        $response = $this->actingAs($user)->postJson('/dashboard/templates', [
            'name' => 'Invalid Template Name!', // Uppercase and spaces invalid
            'category' => 'INVALID_CAT',
            'language' => 'en_US',
            'body_text' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'category', 'body_text']);
    }

    public function test_create_template_handles_meta_api_rejection(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $this->createAccount($workspace);

        Http::fake([
            'https://graph.facebook.com/*/waba_test_123/message_templates*' => Http::response([
                'error' => [
                    'message' => 'Parameter text must contain sample content.',
                    'type' => 'OAuthException',
                    'code' => 100,
                ],
            ], 400),
        ]);

        $response = $this->actingAs($user)->postJson('/dashboard/templates', [
            'name' => 'invalid_sample',
            'category' => 'UTILITY',
            'language' => 'en_US',
            'body_text' => 'Your balance is {{1}}.',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'Failed to create template on Meta: Parameter text must contain sample content.',
        ]);
    }

    public function test_approved_template_can_be_edited_and_locks_category(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $account = $this->createAccount($workspace);

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_tpl_edit_1',
            'name' => 'order_update',
            'language' => 'en_US',
            'category' => TemplateCategory::UTILITY,
            'status' => TemplateStatus::APPROVED,
            'header_type' => 'NONE',
            'body_text' => 'Old body text.',
            'components' => [['type' => 'BODY', 'text' => 'Old body text.']],
            'last_synced_at' => now(),
        ]);

        Http::fake([
            'https://graph.facebook.com/*/meta_tpl_edit_1' => Http::response([
                'success' => true,
            ], 200),
        ]);

        $response = $this->actingAs($user)->patchJson("/dashboard/templates/{$template->id}", [
            'category' => 'MARKETING', // Should be ignored for APPROVED templates
            'header_type' => 'TEXT',
            'header_text' => 'Order Update',
            'body_text' => 'Hi {{1}}, your order is ready.',
            'body_examples' => ['John'],
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'template' => [
                'name' => 'order_update',
                'category' => 'UTILITY',
                'status' => 'PENDING',
            ],
        ]);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/meta_tpl_edit_1')
                && ! isset($request->data()['category'])
                && is_array($request->data()['components'] ?? null);
        });
    }

    public function test_pending_template_cannot_be_edited_under_meta_policy(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $account = $this->createAccount($workspace);

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_tpl_pending_1',
            'name' => 'pending_tpl',
            'language' => 'en_US',
            'category' => TemplateCategory::UTILITY,
            'status' => TemplateStatus::PENDING,
            'header_type' => 'NONE',
            'body_text' => 'Pending body.',
            'components' => [['type' => 'BODY', 'text' => 'Pending body.']],
            'last_synced_at' => now(),
        ]);

        $response = $this->actingAs($user)->patchJson("/dashboard/templates/{$template->id}", [
            'body_text' => 'Updated body.',
        ]);

        $response->assertStatus(422);
    }

    public function test_other_workspace_cannot_edit_template(): void
    {
        [$workspaceA] = $this->createWorkspaceWithUser();
        $accountA = $this->createAccount($workspaceA);
        $templateA = Template::create([
            'workspace_id' => $workspaceA->id,
            'whatsapp_account_id' => $accountA->id,
            'meta_template_id' => 'meta_tpl_iso_1',
            'name' => 'isolated_tpl',
            'language' => 'en_US',
            'category' => TemplateCategory::UTILITY,
            'status' => TemplateStatus::APPROVED,
            'header_type' => 'NONE',
            'body_text' => 'Body.',
            'components' => [['type' => 'BODY', 'text' => 'Body.']],
            'last_synced_at' => now(),
        ]);

        [, $userB] = $this->createWorkspaceWithUser('Beta Corp', 'other@example.com');

        $response = $this->actingAs($userB)->patchJson("/dashboard/templates/{$templateA->id}", [
            'body_text' => 'Tampered body.',
        ]);

        $response->assertStatus(404);
    }

    public function test_template_can_be_deleted_from_meta_and_locally(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser('Delete Corp', 'del@example.com');
        $account = $this->createAccount($workspace);

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_tpl_del_1',
            'name' => 'old_promo',
            'language' => 'en_US',
            'category' => TemplateCategory::MARKETING,
            'status' => TemplateStatus::APPROVED,
            'header_type' => 'NONE',
            'body_text' => 'Old promo',
            'components' => [['type' => 'BODY', 'text' => 'Old promo']],
        ]);

        Http::fake([
            'https://graph.facebook.com/*/waba_test_123/message_templates*' => Http::response([
                'success' => true,
            ], 200),
        ]);

        $response = $this->actingAs($user)->deleteJson("/dashboard/templates/{$template->id}");

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $this->assertSoftDeleted('templates', ['id' => $template->id]);
    }
}
