<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AuthEvent;
use App\Enums\OtpPurpose;
use App\Enums\WorkspaceRole;
use App\Models\EmailOtp;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use App\Notifications\SendEmailOtpNotification;
use App\Notifications\WorkspaceInvitationNotification;
use App\Services\Auth\SessionLimitService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthSecurityAndOtpTest extends TestCase
{
    use RefreshDatabase;

    protected function createWorkspaceWithOwner(string $name = 'Acme Corp', string $email = 'owner@example.com'): array
    {
        $user = User::create([
            'name' => "Owner {$name}",
            'email' => $email,
            'password' => bcrypt('Secret1234!'),
            'email_verified_at' => now(),
        ]);

        $workspace = Workspace::create([
            'owner_id' => $user->id,
            'name' => $name,
            'slug' => Str::slug($name),
            'timezone' => 'Asia/Kolkata',
        ]);

        $workspace->users()->attach($user->id, [
            'role' => WorkspaceRole::OWNER->value,
            'is_available' => true,
        ]);

        $user->forceFill(['current_workspace_id' => $workspace->id])->save();

        return [$workspace, $user];
    }

    // 1. Disposable Email Blocking
    public function test_disposable_emails_are_rejected_during_registration(): void
    {
        $disposableEmails = [
            'attacker@mailinator.com',
            'spam@yopmail.com',
            'test@sub.guerrillamail.com',
        ];

        foreach ($disposableEmails as $email) {
            $response = $this->post('/register', [
                'name' => 'Bad Actor',
                'email' => $email,
                'password' => 'Secret1234!',
                'password_confirmation' => 'Secret1234!',
            ]);

            $response->assertSessionHasErrors('email');
            $this->assertDatabaseMissing('users', ['email' => $email]);
        }
    }

    public function test_inviting_disposable_email_to_workspace_is_rejected(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithOwner();

        $response = $this->actingAs($owner)
            ->post('/dashboard/workspace/members', [
                'email' => 'fake@mailinator.com',
                'role' => 'agent',
            ]);

        $response->assertSessionHasErrors('email');
        $this->assertDatabaseMissing('workspace_invitations', ['email' => 'fake@mailinator.com']);
    }

    public function test_legitimate_emails_pass_disposable_check(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'name' => 'Legit User',
            'email' => 'contact@example.com',
            'password' => 'Secret1234!',
            'password_confirmation' => 'Secret1234!',
        ]);

        $response->assertRedirect('/verify-email');
        $this->assertDatabaseHas('users', ['email' => 'contact@example.com']);
    }

    // 2. Registration + Session Regeneration + Email OTP Verification
    public function test_registration_creates_unverified_user_and_sends_otp(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'name' => 'New Guy',
            'email' => 'newguy@example.com',
            'password' => 'Secret1234!',
            'password_confirmation' => 'Secret1234!',
            'workspace_name' => 'Newbie Org',
        ]);

        $response->assertRedirect('/verify-email');

        $user = User::where('email', 'newguy@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);

        Notification::assertSentTo($user, SendEmailOtpNotification::class);

        $otp = EmailOtp::where('user_id', $user->id)->first();
        $this->assertNotNull($otp);
        $this->assertNotEquals('123456', $otp->code_hash);
        $this->assertTrue(strlen($otp->code_hash) > 20); // Hash length
    }

    public function test_unverified_user_is_blocked_from_dashboard(): void
    {
        $user = User::create([
            'name' => 'Unverified User',
            'email' => 'unverified@example.com',
            'password' => bcrypt('Secret1234!'),
            'email_verified_at' => null,
        ]);

        $workspace = Workspace::create([
            'owner_id' => $user->id,
            'name' => 'Unverified WS',
            'slug' => 'unverified-ws',
            'timezone' => 'Asia/Kolkata',
        ]);

        $workspace->users()->attach($user->id, [
            'role' => WorkspaceRole::OWNER->value,
            'is_available' => true,
        ]);
        $user->forceFill(['current_workspace_id' => $workspace->id])->save();

        $this->actingAs($user)
            ->get('/dashboard/overview')
            ->assertRedirect('/verify-email');

        $this->actingAs($user)
            ->get('/dashboard/workspace')
            ->assertRedirect('/verify-email');
    }

    public function test_submitting_wrong_otp_increments_attempts_and_five_failures_invalidates_code(): void
    {
        $user = User::create([
            'name' => 'OTP User',
            'email' => 'otp@example.com',
            'password' => bcrypt('Secret1234!'),
            'email_verified_at' => null,
        ]);

        $rawCode = '654321';
        $otp = EmailOtp::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'purpose' => OtpPurpose::VERIFY_EMAIL,
            'code_hash' => Hash::make($rawCode),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
        ]);

        // Submit 4 wrong attempts
        for ($i = 0; $i < 4; $i++) {
            $this->actingAs($user)
                ->post('/email/otp/verify', ['code' => '000000'])
                ->assertSessionHasErrors('code');
        }

        $otp->refresh();
        $this->assertEquals(4, $otp->attempts);
        $this->assertNull($otp->used_at);

        // 5th wrong attempt
        $this->actingAs($user)
            ->post('/email/otp/verify', ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $otp->refresh();
        $this->assertEquals(5, $otp->attempts);
        $this->assertNotNull($otp->used_at);

        // Now submitting the real code fails because the OTP was invalidated
        $this->actingAs($user)
            ->post('/email/otp/verify', ['code' => $rawCode])
            ->assertSessionHasErrors('code');
    }

    public function test_submitting_valid_otp_verifies_email_and_unlocks_dashboard(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithOwner('Verify Org', 'verified_user@example.com');
        $user->forceFill(['email_verified_at' => null])->save();

        $rawCode = '987654';
        EmailOtp::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'purpose' => OtpPurpose::VERIFY_EMAIL,
            'code_hash' => Hash::make($rawCode),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
        ]);

        $this->actingAs($user)
            ->post('/email/otp/verify', ['code' => $rawCode])
            ->assertRedirect(route('dashboard.overview'));

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);

        // Can now access dashboard
        $this->actingAs($user)
            ->get('/dashboard/overview')
            ->assertOk();
    }

    public function test_resend_otp_enforces_sixty_second_cooldown(): void
    {
        Notification::fake();

        $user = User::create([
            'name' => 'Cooldown User',
            'email' => 'cooldown@example.com',
            'password' => bcrypt('Secret1234!'),
            'email_verified_at' => null,
        ]);

        $this->actingAs($user)->post('/email/otp/resend')->assertRedirect();

        // 2nd immediate resend must be throttled
        $this->actingAs($user)->post('/email/otp/resend')->assertSessionHasErrors('code');
    }

    // 3. Password Reset via OTP
    public function test_password_reset_otp_send_prevents_email_enumeration(): void
    {
        Notification::fake();

        $user = User::create([
            'name' => 'Existing Person',
            'email' => 'exists@example.com',
            'password' => bcrypt('Secret1234!'),
            'email_verified_at' => now(),
        ]);

        // Send for existing email
        $res1 = $this->postJson('/password/otp/send', ['email' => 'exists@example.com']);
        $res1->assertOk()->assertJson(['message' => 'If your email is registered, you will receive a verification code.']);

        // Send for non-existing email
        $res2 = $this->postJson('/password/otp/send', ['email' => 'doesnotexist@example.com']);
        $res2->assertOk()->assertJson(['message' => 'If your email is registered, you will receive a verification code.']);

        Notification::assertSentTo($user, SendEmailOtpNotification::class);
    }

    public function test_valid_otp_resets_password_and_clears_db_sessions(): void
    {
        $user = User::create([
            'name' => 'Reset Target',
            'email' => 'target_reset@example.com',
            'password' => bcrypt('OldPassword123!'),
            'email_verified_at' => now(),
        ]);

        // Simulate active session
        DB::table('sessions')->insert([
            'id' => 'old_session_123',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Browser',
            'payload' => 'payload',
            'last_activity' => time(),
        ]);

        $rawCode = '112233';
        EmailOtp::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'purpose' => OtpPurpose::PASSWORD_RESET,
            'code_hash' => Hash::make($rawCode),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
        ]);

        $response = $this->post('/password/otp/reset', [
            'email' => 'target_reset@example.com',
            'code' => $rawCode,
            'password' => 'NewStrongPass1!',
            'password_confirmation' => 'NewStrongPass1!',
        ]);

        $response->assertRedirect(route('login'));

        $user->refresh();
        $this->assertTrue(Hash::check('NewStrongPass1!', $user->password));

        // DB sessions cleared
        $this->assertDatabaseMissing('sessions', ['id' => 'old_session_123']);
    }

    // 4. Login Limitations & Anti-Spray
    public function test_login_progressive_lockout_and_logging(): void
    {
        $user = User::create([
            'name' => 'Lock Target',
            'email' => 'lock@example.com',
            'password' => bcrypt('Secret1234!'),
            'email_verified_at' => now(),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', [
                'email' => 'lock@example.com',
                'password' => 'wrong',
            ])->assertSessionHasErrors('email');
        }

        // 6th attempt is throttled
        $this->post('/login', [
            'email' => 'lock@example.com',
            'password' => 'wrong',
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseHas('auth_logs', [
            'email' => 'lock@example.com',
            'event' => AuthEvent::LOGIN_LOCKOUT->value,
        ]);
    }

    public function test_ip_anti_password_spray_blocks_multiple_email_attacks(): void
    {
        // 20 failed attempts on different emails from same IP
        for ($i = 0; $i < 20; $i++) {
            RateLimiter::hit('login-ip:127.0.0.1', 900);
        }

        $response = $this->post('/login', [
            'email' => 'random_target@example.com',
            'password' => 'some_pass',
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_registration_rate_limit_enforces_five_per_hour(): void
    {
        Notification::fake();

        for ($i = 1; $i <= 5; $i++) {
            $res = $this->post('/register', [
                'name' => "User {$i}",
                'email' => "user{$i}@example.com",
                'password' => 'Secret1234!',
                'password_confirmation' => 'Secret1234!',
            ]);
            $res->assertRedirect('/verify-email');
        }

        // 6th attempt from same IP is throttled (429)
        $res = $this->post('/register', [
            'name' => 'User 6',
            'email' => 'user6@example.com',
            'password' => 'Secret1234!',
            'password_confirmation' => 'Secret1234!',
        ]);

        $res->assertStatus(429);
    }

    // 5. Concurrent Session Limit & Logout Other Devices
    public function test_concurrent_sessions_evicts_oldest_beyond_limit(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithOwner('Sessions Corp', 'sessions@example.com');

        // Insert 6 sessions
        for ($i = 1; $i <= 6; $i++) {
            DB::table('sessions')->insert([
                'id' => "session_{$i}",
                'user_id' => $user->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Browser',
                'payload' => 'payload',
                'last_activity' => time() - (7 - $i) * 10,
            ]);
        }

        $service = new SessionLimitService;
        $service->enforce($user, 'session_6');

        // Max limit is 5: session_1 (oldest) must be pruned
        $this->assertDatabaseMissing('sessions', ['id' => 'session_1']);
        $this->assertDatabaseHas('sessions', ['id' => 'session_6']);
    }

    public function test_logout_other_devices_removes_other_sessions(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithOwner('Devices Corp', 'devices@example.com');

        DB::table('sessions')->insert([
            'id' => 'current_session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Browser',
            'payload' => 'payload',
            'last_activity' => time(),
        ]);

        DB::table('sessions')->insert([
            'id' => 'other_session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.2',
            'user_agent' => 'Mobile',
            'payload' => 'payload',
            'last_activity' => time() - 100,
        ]);

        $this->actingAs($user)
            ->withSession(['_token' => 'test_token'])
            ->post('/dashboard/account/logout-other-devices', [
                'current_password' => 'Secret1234!',
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('sessions', ['id' => 'other_session']);
    }

    // 6. Workspace Invitations & Security Fixes
    public function test_workspace_invitations_flow_and_acceptance(): void
    {
        Notification::fake();

        [$workspace, $owner] = $this->createWorkspaceWithOwner('Invite WS', 'inviter@example.com');

        $invitee = User::create([
            'name' => 'Invitee User',
            'email' => 'invitee@example.com',
            'password' => bcrypt('Secret1234!'),
            'email_verified_at' => now(),
        ]);

        // Send invite
        $this->actingAs($owner)
            ->post('/dashboard/workspace/members', [
                'email' => 'invitee@example.com',
                'role' => 'manager',
            ])
            ->assertRedirect();

        $invitation = WorkspaceInvitation::where('email', 'invitee@example.com')->first();
        $this->assertNotNull($invitation);

        Notification::assertSentOnDemand(WorkspaceInvitationNotification::class);

        // Invitee accepts invite
        $plainToken = 'test_token_string_for_invitation_acceptance_12345';
        $invitation->update(['token_hash' => hash('sha256', $plainToken)]);

        $this->actingAs($invitee)
            ->post("/invitations/{$plainToken}/accept")
            ->assertRedirect(route('dashboard.overview'));

        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $invitee->id,
            'role' => WorkspaceRole::MANAGER->value,
        ]);

        $invitation->refresh();
        $this->assertTrue($invitation->isAccepted());
    }

    public function test_workspace_slug_collision_with_soft_deleted_workspace_succeeds(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithOwner('Soft Delete WS', 'soft@example.com');
        $slug = $workspace->slug;
        $workspace->delete(); // Soft delete

        // Creating another workspace with same name generates a unique slug (e.g. soft-delete-ws-1)
        $this->actingAs($owner)
            ->post('/dashboard/workspace', [
                'name' => 'Soft Delete WS',
            ])
            ->assertRedirect(route('dashboard.workspace'));

        $newWs = Workspace::where('name', 'Soft Delete WS')->latest('id')->first();
        $this->assertNotNull($newWs);
        $this->assertNotEquals($slug, $newWs->slug);
        $this->assertStringStartsWith('soft-delete-ws-', $newWs->slug);
    }

    public function test_update_or_delete_user_not_in_workspace_returns_404(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithOwner('Target WS', 'boss@example.com');
        $stranger = User::create([
            'name' => 'Stranger',
            'email' => 'stranger@example.com',
            'password' => bcrypt('Secret1234!'),
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->patch("/dashboard/workspace/members/{$stranger->id}", [
                'role' => 'agent',
            ])
            ->assertNotFound();

        $this->actingAs($owner)
            ->delete("/dashboard/workspace/members/{$stranger->id}")
            ->assertNotFound();
    }

    public function test_workspace_settings_strips_unlisted_keys(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithOwner('Settings WS', 'admin_ws@example.com');

        $this->actingAs($owner)
            ->patch("/dashboard/workspace/{$workspace->uuid}", [
                'settings' => [
                    'currency' => 'INR',
                    'industry' => 'E-Commerce',
                    'malicious_key' => 'exploit',
                ],
            ])
            ->assertRedirect();

        $workspace->refresh();
        $this->assertEquals('INR', $workspace->settings['currency'] ?? null);
        $this->assertEquals('E-Commerce', $workspace->settings['industry'] ?? null);
        $this->assertArrayNotHasKey('malicious_key', $workspace->settings);
    }
}
