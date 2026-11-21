<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\EmailOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationOtpController extends Controller
{
    /**
     * Display the email verification prompt.
     */
    public function notice(Request $request): Response|RedirectResponse|JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->route('dashboard.overview');
        }

        if ($request->expectsJson()) {
            return response()->json([
                'verified' => false,
                'email' => $user->email,
            ]);
        }

        return Inertia::render('Auth/VerifyEmail', [
            'email' => $user->email,
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
