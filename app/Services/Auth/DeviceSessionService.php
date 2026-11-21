<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;
use App\Notifications\NewDeviceLoginNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DeviceSessionService
{
    /**
     * Get formatted active device sessions for the given user.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getActiveDevices(User $user, string $currentSessionId): array
    {
        if (! Schema::hasTable('sessions')) {
            return [
                [
                    'id' => $currentSessionId,
                    'device_number' => 1,
                    'device_name' => 'Current Browser',
                    'browser' => 'Web Browser',
                    'device_type' => 'desktop',
                    'ip_address' => request()->ip() ?? '127.0.0.1',
                    'is_current_device' => true,
                    'last_active_at' => 'Active now',
                    'last_active_timestamp' => time(),
                ],
            ];
        }

        $sessions = DB::table('sessions')
            ->where('user_id', $user->id)
            ->orderByDesc('last_activity')
            ->get();

        if ($sessions->isEmpty()) {
            return [
                [
                    'id' => $currentSessionId,
                    'device_number' => 1,
                    'device_name' => 'Current Browser',
                    'browser' => 'Web Browser',
                    'device_type' => 'desktop',
                    'ip_address' => request()->ip() ?? '127.0.0.1',
                    'is_current_device' => true,
                    'last_active_at' => 'Active now',
                    'last_active_timestamp' => time(),
                ],
            ];
        }

        $devices = [];
        $counter = 1;

        foreach ($sessions as $session) {
            $isCurrent = ($session->id === $currentSessionId);
            $parsed = $this->parseUserAgent((string) $session->user_agent);

            $devices[] = [
                'id' => $session->id,
                'device_number' => $counter++,
                'device_name' => $parsed['platform'],
                'browser' => $parsed['browser'],
                'device_type' => $parsed['device_type'],
                'ip_address' => $session->ip_address ?: '127.0.0.1',
                'is_current_device' => $isCurrent,
                'last_active_at' => $isCurrent ? 'Active now' : Carbon::createFromTimestamp($session->last_activity)->diffForHumans(),
                'last_active_timestamp' => $session->last_activity,
            ];
        }

        return $devices;
    }

    /**
     * Parse User-Agent string into device and browser information.
     *
     * @return array{platform: string, browser: string, device_type: string}
     */
    public function parseUserAgent(string $userAgent): array
    {
        $platform = 'Desktop Device';
        $deviceType = 'desktop';

        if (preg_match('/iPhone/i', $userAgent)) {
            $platform = 'Apple iPhone';
            $deviceType = 'mobile';
        } elseif (preg_match('/iPad/i', $userAgent)) {
            $platform = 'Apple iPad';
            $deviceType = 'tablet';
        } elseif (preg_match('/Android/i', $userAgent)) {
            $platform = 'Android Device';
            $deviceType = preg_match('/Mobile/i', $userAgent) ? 'mobile' : 'tablet';
        } elseif (preg_match('/Windows NT 10.0|Windows NT 11.0|Windows/i', $userAgent)) {
            $platform = 'Windows PC';
            $deviceType = 'desktop';
        } elseif (preg_match('/Macintosh|Mac OS X/i', $userAgent)) {
            $platform = 'Mac';
            $deviceType = 'desktop';
        } elseif (preg_match('/Linux/i', $userAgent)) {
            $platform = 'Linux PC';
            $deviceType = 'desktop';
        }

        $browser = 'Web Browser';
        if (preg_match('/Edg\/([0-9.]+)/i', $userAgent)) {
            $browser = 'Microsoft Edge';
        } elseif (preg_match('/OPR\/([0-9.]+)|Opera/i', $userAgent)) {
            $browser = 'Opera';
        } elseif (preg_match('/Chrome\/([0-9.]+)/i', $userAgent)) {
            $browser = 'Google Chrome';
        } elseif (preg_match('/Firefox\/([0-9.]+)/i', $userAgent)) {
            $browser = 'Mozilla Firefox';
        } elseif (preg_match('/Safari\/([0-9.]+)/i', $userAgent) && ! preg_match('/Chrome/i', $userAgent)) {
            $browser = 'Apple Safari';
        }

        return [
            'platform' => $platform,
            'browser' => $browser,
            'device_type' => $deviceType,
        ];
    }

    /**
     * Send a new device login notification email to the user.
     */
    public function notifyNewDeviceLogin(User $user, Request $request): void
    {
        try {
            $parsed = $this->parseUserAgent((string) $request->userAgent());
            $ipAddress = $request->ip() ?: '127.0.0.1';
            $loginTime = now()->format('M j, Y - g:i A T');

            $user->notify(new NewDeviceLoginNotification(
                deviceName: $parsed['platform'],
                browser: $parsed['browser'],
                ipAddress: $ipAddress,
                loginTime: $loginTime,
            ));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Device login alert mail failed: '.$e->getMessage(), ['exception' => $e]);
        }
    }
}
