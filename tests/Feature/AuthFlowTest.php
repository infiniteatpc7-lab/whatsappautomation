<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\WorkspaceRole;
use App\Models\KanbanBoard;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_render_login_page(): void
    {
        $response = $this->get('/login');

        $response->assertOk();
    }

    public function test_guest_can_render_register_page(): void
    {
        $response = $this->get('/register');

        $response->assertOk();
    }

    public function test_registration_creates_user_default_workspace_kanban_board_and_logs_in(): void
    {
        $response = $this->post('/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'Secret1234!',
            'password_confirmation' => 'Secret1234!',
            'workspace_name' => 'Acme Corp',
            'phone' => '+919876543210',
        ]);

        $response->assertRedirect('/verify-email');

        $this->assertAuthenticated();

        $user = User::where('email', 'john@example.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('John Doe', $user->name);
        $this->assertEquals('+919876543210', $user->phone);

        $workspace = Workspace::where('owner_id', $user->id)->first();
        $this->assertNotNull($workspace);
        $this->assertEquals('Acme Corp', $workspace->name);
        $this->assertEquals($workspace->id, $user->current_workspace_id);

        $pivot = $workspace->users()->where('users.id', $user->id)->first()?->pivot;
        $this->assertNotNull($pivot);
        $roleValue = $pivot->role instanceof WorkspaceRole ? $pivot->role->value : $pivot->role;
        $this->assertEquals(WorkspaceRole::OWNER->value, $roleValue);

        $board = KanbanBoard::where('workspace_id', $workspace->id)->first();
        $this->assertNotNull($board);
        $this->assertEquals('Main Pipeline', $board->name);

        $columns = $board->columns()->orderBy('position')->get();
        $this->assertCount(4, $columns);
        $this->assertEquals(['New Lead', 'Contacted', 'Qualified', 'Won'], $columns->pluck('title')->all());
    }

    public function test_login_succeeds_with_valid_credentials(): void
    {
        $user = User::create([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => bcrypt('Password123!'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $workspace = Workspace::create([
            'owner_id' => $user->id,
            'name' => 'Existing WS',
            'slug' => 'existing-ws',
            'timezone' => 'Asia/Kolkata',
        ]);

        $workspace->users()->attach($user->id, [
            'role' => WorkspaceRole::OWNER->value,
            'is_available' => true,
        ]);

        $user->forceFill(['current_workspace_id' => $workspace->id])->save();

        $response = $this->post('/login', [
            'email' => 'jane@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertRedirect('/dashboard/overview');
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::create([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->post('/login', [
            'email' => 'jane@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_login_enforces_rate_limiting_after_five_failed_attempts(): void
    {
        User::create([
            'name' => 'Target User',
            'email' => 'target@example.com',
            'password' => bcrypt('correct-password'),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $response = $this->post('/login', [
                'email' => 'target@example.com',
                'password' => 'wrong',
            ]);
            $response->assertSessionHasErrors('email');
        }

        // 6th attempt must be throttled
        $response = $this->post('/login', [
            'email' => 'target@example.com',
            'password' => 'wrong',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_logout_invalidates_session_and_redirects_to_login(): void
    {
        $user = User::create([
            'name' => 'Logout User',
            'email' => 'logout@example.com',
            'password' => bcrypt('secret123'),
        ]);

        $this->actingAs($user);

        $response = $this->post('/logout');

        $response->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_unauthenticated_access_to_dashboard_redirects_to_login(): void
    {
        $this->get('/dashboard/overview')->assertRedirect('/login');
        $this->get('/dashboard/workspace')->assertRedirect('/login');
        $this->get('/dashboard/chat')->assertRedirect('/login');
    }

    public function test_health_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertOk()
            ->assertJson([
                'status' => 'ok',
                'service' => 'whatsapp-saas',
            ]);
    }
}
