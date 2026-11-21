<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\AuthEvent;
use App\Http\Controllers\Controller;
use App\Models\AuthLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SessionSecurityController extends Controller
{
    /**
     * Log out from other browser sessions.
     */
    public function logoutOtherDevices(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
        ]);

        /** @var User $user */
        $user = $request->user();

        Auth::logoutOtherDevices($validated['current_password']);

        if (config('session.driver') === 'database' && Schema::hasTable('sessions')) {
            DB::table('sessions')
                ->where('user_id', $user->id)
                ->where('id', '!=', $request->session()->getId())
                ->delete();
        }

        try {
            AuthLog::create([
                'user_id' => $user->id,
                'email' => $user->email,
                'event' => AuthEvent::LOGOUT_OTHER_DEVICES,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Silently continue
        }

        return back()->with('success', 'Other device sessions logged out successfully.');
    }
}
