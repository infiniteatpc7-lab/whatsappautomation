<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\AuthEvent;
use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\AuthLog;
use App\Models\User;
use App\Services\Auth\DeviceSessionService;
use App\Services\Auth\EmailOtpService;
use App\Services\Auth\SessionLimitService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        /** @var User $user */
        $user = Auth::user();

        if ($user->two_factor_enabled) {
            $remember = $request->boolean('remember');
            Auth::guard('web')->logout();

            $request->session()->put('login.two_factor_user_id', $user->id);
            $request->session()->put('login.two_factor_remember', $remember);
            $request->session()->put('login.two_factor_expires_at', now()->addMinutes(10)->timestamp);

            try {
                app(EmailOtpService::class)->issue($user, OtpPurpose::TWO_FACTOR, $request->ip());
            } catch (ValidationException) {
                // Rate limited, user can enter previous code or wait for cooldown
            }

            return redirect()->route('two-factor.challenge');
        }

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

        return redirect()->intended(route('dashboard.overview'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $user = Auth::user();

        if ($user) {
            try {
                AuthLog::create([
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'event' => AuthEvent::LOGOUT,
                    'ip_address' => $request->ip(),
                    'user_agent' => substr((string) $request->userAgent(), 0, 500),
                    'created_at' => now(),
                ]);
            } catch (\Throwable) {
                // Silently continue
            }
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
