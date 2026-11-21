<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\AuthEvent;
use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordOtpRequest;
use App\Http\Requests\Auth\SendPasswordOtpRequest;
use App\Models\AuthLog;
use App\Models\User;
use App\Services\Auth\EmailOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class PasswordResetOtpController extends Controller
{
    /**
     * Send a password reset OTP code.
     */
    public function send(SendPasswordOtpRequest $request, EmailOtpService $otpService): RedirectResponse|JsonResponse
    {
        $email = $request->string('email')->toString();

        /** @var User|null $user */
        $user = User::where('email', $email)->first();

        if ($user) {
            try {
                $otpService->issue($user, OtpPurpose::PASSWORD_RESET, $request->ip());
            } catch (ValidationException) {
                // Suppress cooldown / rate-limit validation exceptions to prevent email enumeration
            }
        }

        $message = 'If your email is registered, you will receive a verification code.';

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
            ]);
        }

        return back()->with('status', $message);
    }

    /**
     * Reset the user's password using the submitted OTP code.
     */
    public function reset(ResetPasswordOtpRequest $request, EmailOtpService $otpService): RedirectResponse|JsonResponse
    {
        $email = $request->string('email')->toString();
        $code = $request->string('code')->toString();
        $password = $request->string('password')->toString();

        /** @var User|null $user */
        $user = User::where('email', $email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => 'Invalid email or verification code.',
            ]);
        }

        $otpService->verify($user, OtpPurpose::PASSWORD_RESET, $code, $request->ip());

        $user->forceFill([
            'password' => Hash::make($password),
        ])->save();

        if (config('session.driver') === 'database' && Schema::hasTable('sessions')) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        try {
            AuthLog::create([
                'user_id' => $user->id,
                'email' => $user->email,
                'event' => AuthEvent::PASSWORD_RESET,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Silently continue
        }

        if ($request->expectsJson()) {
            return response()->json([
                'status' => 'password_reset_success',
            ]);
        }

        return redirect()->route('login')->with('status', 'Password has been reset. Please log in.');
    }
}
