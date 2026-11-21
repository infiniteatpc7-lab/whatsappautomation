<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Enums\AuthEvent;
use App\Enums\OtpPurpose;
use App\Models\AuthLog;
use App\Models\EmailOtp;
use App\Models\User;
use App\Notifications\SendEmailOtpNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Request;
use Illuminate\Validation\ValidationException;

class EmailOtpService
{
    /**
     * Issue and send a new 6-digit OTP code to the given user.
     *
     * @throws ValidationException
     */
    public function issue(User $user, OtpPurpose $purpose, ?string $ipAddress = null): string
    {
        $ip = $ipAddress ?? Request::ip() ?? '127.0.0.1';
        $cooldownKey = "otp-cooldown:{$purpose->value}:{$user->id}";
        $hourlyKey = "otp-hourly:{$purpose->value}:{$user->id}:{$ip}";

        if (RateLimiter::tooManyAttempts($cooldownKey, 1)) {
            $seconds = RateLimiter::availableIn($cooldownKey);
            throw ValidationException::withMessages([
                'code' => "Please wait {$seconds} seconds before requesting a new code.",
            ]);
        }

        if (RateLimiter::tooManyAttempts($hourlyKey, 5)) {
            $seconds = RateLimiter::availableIn($hourlyKey);
            throw ValidationException::withMessages([
                'code' => 'Too many verification code requests. Please try again later.',
            ]);
        }

        RateLimiter::hit($cooldownKey, 60);
        RateLimiter::hit($hourlyKey, 3600);

        // Invalidate all previous unused OTPs for this user and purpose
        EmailOtp::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        EmailOtp::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(10),
            'ip_address' => $ip,
            'created_at' => now(),
        ]);

        $user->notify(new SendEmailOtpNotification($code, $purpose, 10));

        AuthLog::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'event' => AuthEvent::OTP_SENT,
            'ip_address' => $ip,
            'user_agent' => substr((string) Request::userAgent(), 0, 500),
            'metadata' => ['purpose' => $purpose->value],
            'created_at' => now(),
        ]);

        return $code;
    }

    /**
     * Verify an OTP code for the given user.
     *
     * @throws ValidationException
     */
    public function verify(User $user, OtpPurpose $purpose, string $code, ?string $ipAddress = null): bool
    {
        $ip = $ipAddress ?? Request::ip() ?? '127.0.0.1';

        /** @var EmailOtp|null $otp */
        $otp = EmailOtp::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->where('attempts', '<', 5)
            ->latest('id')
            ->first();

        if (! $otp) {
            AuthLog::create([
                'user_id' => $user->id,
                'email' => $user->email,
                'event' => AuthEvent::OTP_FAILED,
                'ip_address' => $ip,
                'user_agent' => substr((string) Request::userAgent(), 0, 500),
                'metadata' => ['purpose' => $purpose->value, 'reason' => 'expired_or_not_found'],
                'created_at' => now(),
            ]);

            throw ValidationException::withMessages([
                'code' => 'Invalid or expired verification code.',
            ]);
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');

            if ($otp->attempts >= $otp->max_attempts) {
                $otp->update(['used_at' => now()]);
            }

            AuthLog::create([
                'user_id' => $user->id,
                'email' => $user->email,
                'event' => AuthEvent::OTP_FAILED,
                'ip_address' => $ip,
                'user_agent' => substr((string) Request::userAgent(), 0, 500),
                'metadata' => ['purpose' => $purpose->value, 'attempts' => $otp->attempts],
                'created_at' => now(),
            ]);

            throw ValidationException::withMessages([
                'code' => 'Invalid or expired verification code.',
            ]);
        }

        $otp->update(['used_at' => now()]);

        AuthLog::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'event' => AuthEvent::OTP_VERIFIED,
            'ip_address' => $ip,
            'user_agent' => substr((string) Request::userAgent(), 0, 500),
            'metadata' => ['purpose' => $purpose->value],
            'created_at' => now(),
        ]);

        return true;
    }
}
