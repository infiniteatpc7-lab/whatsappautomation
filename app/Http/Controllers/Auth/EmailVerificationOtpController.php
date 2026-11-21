<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Models\EmailOtp;
use App\Models\User;
use App\Services\Auth\EmailOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationOtpController extends Controller
{
    /**
     * Display the email verification prompt.
     */
    public function notice(Request $request, EmailOtpService $otpService): Response|RedirectResponse|JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->route('dashboard.overview');
        }

        // Auto-issue a fresh verification code if the user has no valid, unexpired OTP
        $hasActiveOtp = EmailOtp::where('user_id', $user->id)
            ->where('purpose', OtpPurpose::VERIFY_EMAIL)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->whereColumn('attempts', '<', 'max_attempts')
            ->exists();

        if (! $hasActiveOtp) {
            try {
                $otpService->issue($user, OtpPurpose::VERIFY_EMAIL, $request->ip());
            } catch (ValidationException) {
                // Rate limit or cooldown in effect, gracefully proceed
            }
        }

        $cooldownKey = "otp-cooldown:verify_email:{$user->id}";
        $remainingCooldown = RateLimiter::availableIn($cooldownKey);

        if ($request->expectsJson()) {
            return response()->json([
                'verified' => false,
                'email' => $user->email,
                'cooldown' => max(0, $remainingCooldown),
            ]);
        }

        return Inertia::render('Auth/VerifyEmail', [
            'email' => $user->email,
            'cooldown' => max(0, $remainingCooldown),
        ]);
    }

    /**
     * Verify the user's email using the submitted 6-digit OTP code.
     */
    public function verify(Request $request, EmailOtpService $otpService): RedirectResponse|JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $otpService->verify(
            $user,
            OtpPurpose::VERIFY_EMAIL,
            (string) $request->input('code'),
            $request->ip()
        );

        $user->markEmailAsVerified();

        if ($request->expectsJson()) {
            return response()->json([
                'status' => 'verified',
            ]);
        }

        return redirect()->route('dashboard.overview')->with('success', 'Email verified successfully.');
    }

    /**
     * Resend the verification OTP code.
     */
    public function resend(Request $request, EmailOtpService $otpService): RedirectResponse|JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->route('dashboard.overview');
        }

        $otpService->issue(
            $user,
            OtpPurpose::VERIFY_EMAIL,
            $request->ip()
        );

        if ($request->expectsJson()) {
            return response()->json([
                'status' => 'resent',
            ]);
        }

        return back()->with('success', 'Verification code resent.');
    }
}
