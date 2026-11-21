<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use App\Support\WorkspaceContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class WorkspaceInvitationController extends Controller
{
    /**
     * Accept a workspace invitation.
     */
    public function accept(Request $request, string $token): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $tokenHash = hash('sha256', $token);

        /** @var WorkspaceInvitation|null $invitation */
        $invitation = WorkspaceInvitation::where('token_hash', $tokenHash)->firstOrFail();

        if ($invitation->isExpired()) {
            abort(410, 'This invitation has expired.');
        }

        if ($invitation->isAccepted()) {
            abort(409, 'This invitation has already been accepted.');
        }

        if (strtolower($user->email) !== strtolower($invitation->email)) {
            abort(403, 'This invitation was sent to a different email address.');
        }

        /** @var Workspace $workspace */
        $workspace = $invitation->workspace;

        if (! $workspace->users()->where('users.id', $user->id)->exists()) {
            $workspace->users()->attach($user->id, [
                'role' => $invitation->role->value,
                'is_available' => true,
            ]);
        }

        $invitation->update(['accepted_at' => now()]);

        $user->forceFill(['current_workspace_id' => $workspace->id])->save();
        app(WorkspaceContext::class)->setWorkspace($workspace);

        return redirect()->route('dashboard.overview')->with('success', "You have joined {$workspace->name}.");
    }

    /**
     * Revoke a pending workspace invitation.
     */
    public function destroy(Request $request, WorkspaceInvitation $invitation): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var Workspace|null $workspace */
        $workspace = app(WorkspaceContext::class)->getWorkspace()
            ?? ($user->current_workspace_id ? $user->currentWorkspace : null);

        if (! $workspace || $invitation->workspace_id !== $workspace->id) {
            abort(404);
        }

        if (! $user->can('manageMembers', $workspace)) {
            abort(403, 'Unauthorized.');
        }

        $invitation->delete();

        return back()->with('success', 'Invitation revoked successfully.');
    }
}
