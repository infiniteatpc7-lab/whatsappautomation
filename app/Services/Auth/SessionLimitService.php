<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SessionLimitService
{
    /**
     * Enforce maximum concurrent active sessions for the user.
     */
    public function enforce(User $user, string $currentSessionId): void
    {
        if (config('session.driver') !== 'database') {
            return;
        }

        if (! Schema::hasTable('sessions')) {
            return;
        }

        $maxSessions = (int) config('auth.max_concurrent_sessions', 5);
        if ($maxSessions <= 0) {
            return;
        }

        $sessions = DB::table('sessions')
            ->where('user_id', $user->id)
            ->orderByDesc('last_activity')
            ->get();

        if ($sessions->count() <= $maxSessions) {
            return;
        }

        $retainedIds = [$currentSessionId];
        foreach ($sessions as $session) {
            if ($session->id !== $currentSessionId && count($retainedIds) < $maxSessions) {
                $retainedIds[] = $session->id;
            }
        }

        DB::table('sessions')
            ->where('user_id', $user->id)
            ->whereNotIn('id', $retainedIds)
            ->delete();
    }
}
