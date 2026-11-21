<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\AuthEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\AuthLog;
use App\Models\User;
use App\Services\Auth\SessionLimitService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();

        if (! $user->current_workspace_id || ! $user->workspaces()->where('workspaces.id', $user->current_workspace_id)->exists()) {
            $firstWorkspace = $user->workspaces()->first();
            if ($firstWorkspace) {
                $user->current_workspace_id = $firstWorkspace->id;
                $user->save();
            }
        }

        $sessionId = $request->session()->getId();
        app(SessionLimitService::class)->enforce($user, $sessionId);

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
