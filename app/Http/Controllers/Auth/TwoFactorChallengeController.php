<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\DeviceSessionService;
use App\Services\Auth\EmailOtpService;
use App\Services\Auth\SessionLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorChallengeController extends Controller
{
    /**
     * Show the two-factor authentication challenge view.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $userId = $request->session()->get('login.two_factor_user_id');

        if (! $userId) {
            return redirect()->route('login');
        }

        $user = User::find($userId);
        if (! $user) {
            $request->session()->forget(['login.two_factor_user_id', 'login.two_factor_remember']);

            return redirect()->route('login');
        }

        $cooldownKey = "otp-cooldown:two_factor:{$user->id}";
        $remainingCooldown = RateLimiter::availableIn($cooldownKey);

        return Inertia::render('Auth/TwoFactorChallenge', [
            'email' => $user->email,
            'cooldown' => max(0, $remainingCooldown),
        ]);
    }

    /**
     * Verify the two-factor OTP and authenticate the user.
     */
    public function store(Request $request, EmailOtpService $otpService): RedirectResponse|JsonResponse
    {
        $userId = $request->session()->get('login.two_factor_user_id');

        if (! $userId) {
            return redirect()->route('login');
        }

        $user = User::findOrFail($userId);

        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $otpService->verify(
            $user,
            OtpPurpose::TWO_FACTOR,
            (string) $request->input('code'),
            $request->ip()
        );

        $remember = (bool) $request->session()->pull('login.two_factor_remember', false);
        $request->session()->forget('login.two_factor_user_id');

        Auth::login($user, $remember);
        $request->session()->regenerate();

        if (! $user->current_workspace_id || ! $user->workspaces()->where('workspaces.id', $user->current_workspace_id)->exists()) {
            $firstWorkspace = $user->workspaces()->first();
            if ($firstWorkspace) {
                $user->current_workspace_id = $firstWorkspace->id;
                $user->save();
            }
        }

        $sessionId = $request->session()->getId();
        app(SessionLimitService::class)->enforce($user, $sessionId);
        app(DeviceSessionService::class)->notifyNewDeviceLogin($user, $request);

        if ($request->expectsJson()) {
            return response()->json(['status' => 'authenticated']);
        }

        return redirect()->intended(route('dashboard.overview'));
    }

    /**
     * Resend the two-factor authentication code.
     */
    public function resend(Request $request, EmailOtpService $otpService): RedirectResponse|JsonResponse
    {
        $userId = $request->session()->get('login.two_factor_user_id');

        if (! $userId) {
            return redirect()->route('login');
        }

        $user = User::findOrFail($userId);

        $otpService->issue(
            $user,
            OtpPurpose::TWO_FACTOR,
            $request->ip()
        );

        if ($request->expectsJson()) {
            return response()->json(['status' => 'resent']);
        }

        return back()->with('success', 'Two-factor authentication code resent.');
    }
}
