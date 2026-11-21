<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\OtpPurpose;
use App\Enums\WorkspacePlan;
use App\Enums\WorkspaceRole;
use App\Models\EmailOtp;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\SendEmailOtpNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class TwoFactorAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function createUserWithWorkspace(bool $twoFactor = false): User
    {
        $user = User::create([
            'name' => '2FA Test User',
            'email' => 'twofactor@example.com',
            'password' => Hash::make('Secret1234!'),
            'two_factor_enabled' => $twoFactor,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $workspace = Workspace::create([
            'owner_id' => $user->id,
            'name' => '2FA Workspace',
            'slug' => '2fa-workspace-'.Str::random(6),
            'timezone' => 'Asia/Kolkata',
            'plan' => WorkspacePlan::STARTER,
        ]);

        $workspace->users()->attach($user->id, [
            'role' => WorkspaceRole::OWNER->value,
            'is_available' => true,
        ]);

        $user->forceFill(['current_workspace_id' => $workspace->id])->save();

        return $user;
    }

    public function test_user_can_toggle_two_factor_authentication(): void
    {
        $user = $this->createUserWithWorkspace(false);

        $response = $this->actingAs($user)->patch('/dashboard/account/two-factor', [
            'enabled' => true,
        ]);

        $response->assertRedirect();
        $this->assertTrue($user->fresh()->two_factor_enabled);

        $response2 = $this->actingAs($user)->patch('/dashboard/account/two-factor', [
            'enabled' => false,
        ]);

        $response2->assertRedirect();
        $this->assertFalse($user->fresh()->two_factor_enabled);
    }

    public function test_login_without_2fa_redirects_directly_to_dashboard(): void
    {
        $user = $this->createUserWithWorkspace(false);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'Secret1234!',
        ]);

        $response->assertRedirect(route('dashboard.overview'));
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_with_2fa_redirects_to_challenge_and_sends_otp(): void
    {
        Notification::fake();

        $user = $this->createUserWithWorkspace(true);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'Secret1234!',
        ]);

        $response->assertRedirect(route('two-factor.challenge'));
        $this->assertGuest();
        $this->assertEquals($user->id, session('login.two_factor_user_id'));

        Notification::assertSentTo(
            $user,
            SendEmailOtpNotification::class,
            function (SendEmailOtpNotification $notification) {
                return $notification->purpose === OtpPurpose::TWO_FACTOR;
            }
        );
    }

    public function test_invalid_2fa_code_fails(): void
    {
        $user = $this->createUserWithWorkspace(true);

        $response = $this->withSession(['login.two_factor_user_id' => $user->id])
            ->post('/two-factor-challenge', [
                'code' => '000000',
            ]);

        $response->assertSessionHasErrors('code');
        $this->assertGuest();
    }

    public function test_valid_2fa_code_authenticates_user_and_unlocks_dashboard(): void
    {
        $user = $this->createUserWithWorkspace(true);
        $rawCode = '654321';

        EmailOtp::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'purpose' => OtpPurpose::TWO_FACTOR,
            'code_hash' => Hash::make($rawCode),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
        ]);

        $response = $this->withSession(['login.two_factor_user_id' => $user->id])
            ->post('/two-factor-challenge', [
                'code' => $rawCode,
            ]);

        $response->assertRedirect(route('dashboard.overview'));
        $this->assertAuthenticatedAs($user);
        $this->assertNull(session('login.two_factor_user_id'));
    }
}
