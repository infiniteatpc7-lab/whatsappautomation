<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CampaignStatus;
use App\Enums\ConversationStatus;
use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Enums\WhatsAppConnectionType;
use App\Enums\WorkspaceRole;
use App\Models\Campaign;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\KanbanBoard;
use App\Models\Template;
use App\Models\User;
use App\Models\WhatsAppAccount;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WorkspaceAndTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function createWorkspaceWithUser(string $name, string $userEmail, WorkspaceRole $role = WorkspaceRole::OWNER): array
    {
        $user = User::create([
            'name' => "User {$name}",
            'email' => $userEmail,
            'password' => bcrypt('password123'),
        ]);

        $workspace = Workspace::create([
            'owner_id' => $role === WorkspaceRole::OWNER ? $user->id : null,
            'name' => $name,
            'slug' => Str::slug($name),
            'timezone' => 'Asia/Kolkata',
        ]);

        $workspace->users()->attach($user->id, [
            'role' => $role->value,
            'is_available' => true,
        ]);

        $user->forceFill(['current_workspace_id' => $workspace->id])->save();

        return [$workspace, $user];
    }

    public function test_authenticated_user_receives_shared_inertia_auth_props_with_zero_leaked_secrets(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser('Tenant Alpha', 'alpha@example.com');

        // Create whatsapp account with sensitive credentials
        WhatsAppAccount::create([
            'workspace_id' => $workspace->id,
            'display_phone_number' => '+919999999999',
            'phone_number_id' => '10001',
            'waba_id' => '20001',
            'access_token' => 'SECRET_ACCESS_TOKEN_DO_NOT_LEAK',
            'app_secret' => 'SECRET_APP_SECRET_DO_NOT_LEAK',
            'webhook_verify_token' => 'SECRET_VERIFY_TOKEN',
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'status' => WhatsAppAccountStatus::CONNECTED,
        ]);

        $this->actingAs($user)
            ->get('/dashboard/workspace')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Workspace')
                ->has('auth.user', fn (Assert $userProp) => $userProp
                    ->where('id', $user->id)
                    ->where('name', $user->name)
                    ->where('email', $user->email)
                    ->etc()
                )
                ->has('auth.workspace', fn (Assert $wsProp) => $wsProp
                    ->where('id', $workspace->id)
                    ->where('name', 'Tenant Alpha')
                    ->where('role', 'owner')
                    ->etc()
                )
                ->has('auth.workspaces', 1)
                ->has('whatsappAccount', fn (Assert $wa) => $wa
                    ->where('phone_number', '+919999999999')
                    ->missing('access_token')
                    ->missing('app_secret')
                    ->missing('webhook_verify_token')
                    ->etc()
                )
            );
    }

    public function test_owner_can_update_workspace_settings_and_create_second_workspace(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser('Alpha HQ', 'owner@alpha.com');

        $this->actingAs($user)
            ->patch("/dashboard/workspace/{$workspace->uuid}", [
                'name' => 'Alpha Global',
                'timezone' => 'UTC',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('workspaces', [
            'id' => $workspace->id,
            'name' => 'Alpha Global',
            'timezone' => 'UTC',
        ]);

        // Create second workspace
        $this->actingAs($user)
            ->post('/dashboard/workspace', [
                'name' => 'Beta Branch',
                'timezone' => 'Asia/Kolkata',
            ])
            ->assertRedirect(route('dashboard.workspace'));

        $this->assertDatabaseHas('workspaces', [
            'name' => 'Beta Branch',
            'owner_id' => $user->id,
        ]);

        $betaWs = Workspace::where('name', 'Beta Branch')->first();
        $user->refresh();
        $this->assertEquals($betaWs->id, $user->current_workspace_id);

        // Switch back to original workspace
        $this->actingAs($user)
            ->post("/dashboard/workspace/switch/{$workspace->uuid}")
            ->assertRedirect();

        $user->refresh();
        $this->assertEquals($workspace->id, $user->current_workspace_id);
    }

    public function test_agent_role_is_denied_from_modifying_workspace_or_managing_members(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('Main Shop', 'owner@shop.com', WorkspaceRole::OWNER);

        $agent = User::create([
            'name' => 'Agent Bob',
            'email' => 'bob@shop.com',
            'password' => bcrypt('password123'),
            'current_workspace_id' => $workspace->id,
        ]);

        $workspace->users()->attach($agent->id, [
            'role' => WorkspaceRole::AGENT->value,
            'is_available' => true,
        ]);

        // Agent attempts to update workspace -> 403
        $this->actingAs($agent)
            ->patch("/dashboard/workspace/{$workspace->uuid}", [
                'name' => 'Hacked Shop Name',
            ])
            ->assertForbidden();

        // Agent attempts to add member -> 403
        $this->actingAs($agent)
            ->post('/dashboard/workspace/members', [
                'email' => 'other@shop.com',
                'role' => 'agent',
            ])
            ->assertForbidden();

        // Agent attempts to remove member -> 403
        $this->actingAs($agent)
            ->delete("/dashboard/workspace/members/{$owner->id}")
            ->assertForbidden();
    }

    public function test_workspace_owner_cannot_be_removed(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('Safe HQ', 'safe@hq.com', WorkspaceRole::OWNER);

        $admin = User::create([
            'name' => 'Admin Alice',
            'email' => 'admin@hq.com',
            'password' => bcrypt('password123'),
            'current_workspace_id' => $workspace->id,
        ]);

        $workspace->users()->attach($admin->id, [
            'role' => WorkspaceRole::ADMIN->value,
            'is_available' => true,
        ]);

        // Admin attempts to delete owner -> 422
        $response = $this->actingAs($admin)
            ->delete("/dashboard/workspace/members/{$owner->id}");

        $response->assertStatus(422);

        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $owner->id,
        ]);
    }

    public function test_cross_tenant_isolation_is_strictly_enforced_across_policies(): void
    {
        [$wsA, $userA] = $this->createWorkspaceWithUser('Tenant A', 'user_a@example.com');
        [$wsB, $userB] = $this->createWorkspaceWithUser('Tenant B', 'user_b@example.com');

        // User A attempts to switch to Tenant B -> 403
        $this->actingAs($userA)
            ->post("/dashboard/workspace/switch/{$wsB->uuid}")
            ->assertForbidden();

        // Create resource in Tenant B
        $accountB = WhatsAppAccount::create([
            'workspace_id' => $wsB->id,
            'display_phone_number' => '+918888888888',
            'phone_number_id' => '10002',
            'waba_id' => '20002',
            'access_token' => 'TOKEN_B',
            'webhook_verify_token' => 'VERIFY_TOKEN_B',
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'status' => WhatsAppAccountStatus::CONNECTED,
        ]);

        $contactB = Contact::create([
            'workspace_id' => $wsB->id,
            'wa_id' => '917777777777',
            'name' => 'Target Lead',
        ]);

        $conversationB = Conversation::create([
            'workspace_id' => $wsB->id,
            'whatsapp_account_id' => $accountB->id,
            'contact_id' => $contactB->id,
            'status' => ConversationStatus::OPEN,
        ]);

        $templateB = Template::create([
            'workspace_id' => $wsB->id,
            'whatsapp_account_id' => $accountB->id,
            'meta_template_id' => 'tmpl_1001',
            'name' => 'welcome_offer',
            'language' => 'en',
            'category' => TemplateCategory::MARKETING,
            'status' => TemplateStatus::APPROVED,
            'components' => [],
        ]);

        $campaignB = Campaign::create([
            'workspace_id' => $wsB->id,
            'whatsapp_account_id' => $accountB->id,
            'template_id' => $templateB->id,
            'name' => 'Black Friday',
            'status' => CampaignStatus::DRAFT,
        ]);

        $boardB = KanbanBoard::create([
            'workspace_id' => $wsB->id,
            'name' => 'Board B',
        ]);

        // Policy checks: User A must be DENIED access to all Tenant B resources
        $this->assertFalse($userA->can('view', $wsB));
        $this->assertFalse($userA->can('update', $wsB));
        $this->assertFalse($userA->can('manageMembers', $wsB));

        $this->assertFalse($userA->can('view', $accountB));
        $this->assertFalse($userA->can('update', $accountB));
        $this->assertFalse($userA->can('delete', $accountB));

        $this->assertFalse($userA->can('view', $contactB));
        $this->assertFalse($userA->can('update', $contactB));
        $this->assertFalse($userA->can('delete', $contactB));

        $this->assertFalse($userA->can('view', $conversationB));
        $this->assertFalse($userA->can('reply', $conversationB));
        $this->assertFalse($userA->can('assign', $conversationB));
        $this->assertFalse($userA->can('updateStatus', $conversationB));

        $this->assertFalse($userA->can('view', $templateB));
        $this->assertFalse($userA->can('update', $templateB));
        $this->assertFalse($userA->can('delete', $templateB));

        $this->assertFalse($userA->can('view', $campaignB));
        $this->assertFalse($userA->can('update', $campaignB));
        $this->assertFalse($userA->can('delete', $campaignB));
        $this->assertFalse($userA->can('launch', $campaignB));

        $this->assertFalse($userA->can('view', $boardB));
        $this->assertFalse($userA->can('update', $boardB));
        $this->assertFalse($userA->can('delete', $boardB));
    }
}
