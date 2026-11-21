<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\WorkspacePlan;
use App\Enums\WorkspaceRole;
use App\Http\Controllers\Auth\SessionSecurityController;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\NewDeviceLoginNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DeviceSessionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function createUserWithWorkspace(): User
    {
        $user = User::create([
            'name' => 'Device Test User',
            'email' => 'devicetest@example.com',
            'password' => Hash::make('Secret1234!'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $workspace = Workspace::create([
            'owner_id' => $user->id,
            'name' => 'Device Org',
            'slug' => 'device-org-'.Str::random(6),
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

    public function test_user_can_register_without_workspace_name_field(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'name' => 'Clean Registration User',
            'email' => 'cleanuser@example.com',
            'password' => 'Secret1234!',
            'password_confirmation' => 'Secret1234!',
        ]);

        $response->assertRedirect(route('verification.notice'));
        $this->assertDatabaseHas('users', ['email' => 'cleanuser@example.com']);

        $user = User::where('email', 'cleanuser@example.com')->firstOrFail();
        $this->assertDatabaseHas('workspaces', [
            'owner_id' => $user->id,
            'name' => "Clean Registration User's Workspace",
        ]);
    }

    public function test_account_page_returns_active_devices(): void
    {
        $user = $this->createUserWithWorkspace();

        DB::table('sessions')->insert([
            'id' => 'test_session_device_1',
            'user_id' => $user->id,
            'ip_address' => '192.168.1.100',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'payload' => serialize([]),
            'last_activity' => time(),
        ]);

        $response = $this->actingAs($user)
            ->withSession(['_token' => 'dummy'])
            ->get('/dashboard/account');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Account/Index')
            ->has('devices')
        );
    }

    public function test_user_can_revoke_another_device_session(): void
    {
        $user = $this->createUserWithWorkspace();

        DB::table('sessions')->insert([
            'id' => 'session_device_primary',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
            'payload' => serialize([]),
            'last_activity' => time(),
        ]);

        DB::table('sessions')->insert([
            'id' => 'session_device_secondary',
            'user_id' => $user->id,
            'ip_address' => '192.168.1.50',
            'user_agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
            'payload' => serialize([]),
            'last_activity' => time() - 3600,
        ]);

        $response = $this->actingAs($user)
            ->delete('/dashboard/account/devices/session_device_secondary');

        $response->assertRedirect();
        $this->assertDatabaseMissing('sessions', ['id' => 'session_device_secondary']);
        $this->assertDatabaseHas('sessions', ['id' => 'session_device_primary']);
    }

    public function test_user_cannot_revoke_current_device_session_via_devices_endpoint(): void
    {
        $user = $this->createUserWithWorkspace();
        $currentSessionId = Str::random(40);

        DB::table('sessions')->insert([
            'id' => $currentSessionId,
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0.0.0',
            'payload' => serialize([]),
            'last_activity' => time(),
        ]);

        $request = Request::create('/dashboard/account/devices/'.$currentSessionId, 'DELETE');
        $sessionStore = app('session.store');
        $sessionStore->start();
        $sessionStore->setId($currentSessionId);
        $request->setLaravelSession($sessionStore);
        $request->setUserResolver(fn () => $user);

        $controller = new SessionSecurityController;
        $response = $controller->logoutDevice($request, $currentSessionId);

        $this->assertEquals(302, $response->getStatusCode());
        $this->assertEquals(
            'Cannot revoke current device session. Use the Log Out button instead.',
            $response->getSession()->get('error')
        );
        $this->assertDatabaseHas('sessions', ['id' => $currentSessionId]);
    }

    public function test_user_receives_security_alert_notification_on_login(): void
    {
        Notification::fake();

        $user = $this->createUserWithWorkspace();

        $response = $this->withServerVariables([
            'HTTP_USER_AGENT' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'REMOTE_ADDR' => '103.21.244.2',
        ])->post('/login', [
            'email' => $user->email,
            'password' => 'Secret1234!',
        ]);

        $response->assertRedirect('/dashboard/overview');

        Notification::assertSentTo($user, NewDeviceLoginNotification::class, function (NewDeviceLoginNotification $notification) {
            return $notification->deviceName === 'Windows PC'
                && $notification->browser === 'Google Chrome'
                && $notification->ipAddress === '103.21.244.2';
        });
    }
}
