<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\WorkspaceRole;
use App\Http\Requests\Workspace\AddWorkspaceMemberRequest;
use App\Http\Requests\Workspace\UpdateWorkspaceMemberRequest;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use App\Notifications\WorkspaceInvitationNotification;
use App\Support\WorkspaceContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class WorkspaceMemberController extends Controller
{
    protected function getActiveWorkspace(Request $request): Workspace
    {
        /** @var User $user */
        $user = $request->user();

        /** @var Workspace|null $workspace */
        $workspace = app(WorkspaceContext::class)->getWorkspace()
            ?? ($user->current_workspace_id ? $user->currentWorkspace : null)
            ?? $user->workspaces()->first();

        if (! $workspace) {
            abort(403, 'No active workspace found.');
        }

        return $workspace;
    }

    public function store(AddWorkspaceMemberRequest $request): RedirectResponse
    {
        $workspace = $this->getActiveWorkspace($request);
        $validated = $request->validated();
        $email = $validated['email'];

        // Check if user is already an active member of this workspace
        if ($workspace->users()->where('users.email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => 'User is already a member of this workspace.',
            ]);
        }

        // Invalidate previous pending invitations for this email in this workspace
        $workspace->invitations()
            ->where('email', $email)
            ->whereNull('accepted_at')
            ->delete();

        $plainToken = Str::random(64);
        $tokenHash = hash('sha256', $plainToken);

        $workspace->invitations()->create([
            'invited_by' => $request->user()?->id,
            'email' => $email,
            'role' => $validated['role'],
            'token_hash' => $tokenHash,
            'expires_at' => now()->addDays(7),
        ]);

        Notification::route('mail', $email)
            ->notify(new WorkspaceInvitationNotification($workspace, $plainToken, $validated['role']));

        return back()->with('success', 'Invitation sent successfully.');
    }

    public function update(UpdateWorkspaceMemberRequest $request, User $user): RedirectResponse
    {
        $workspace = $this->getActiveWorkspace($request);

        abort_unless($workspace->users()->where('users.id', $user->id)->exists(), 404);

        $validated = $request->validated();

        if ($workspace->owner_id === $user->id && isset($validated['role']) && $validated['role'] !== WorkspaceRole::OWNER->value) {
            abort(422, 'Cannot change owner role.');
        }

        $pivotData = [];
        if (isset($validated['role'])) {
            $pivotData['role'] = $validated['role'];
        }
        if (isset($validated['is_available'])) {
            $pivotData['is_available'] = $validated['is_available'];
        }

        if (! empty($pivotData)) {
            $workspace->users()->updateExistingPivot($user->id, $pivotData);
        }

        return back()->with('success', 'Member updated successfully.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $workspace = $this->getActiveWorkspace($request);

        // Check policy
        if (! $request->user()?->can('manageMembers', $workspace)) {
            abort(403, 'Unauthorized.');
        }

        abort_unless($workspace->users()->where('users.id', $user->id)->exists(), 404);

        if ($workspace->owner_id === $user->id) {
            abort(422, 'Cannot remove the workspace owner.');
        }

        $workspace->users()->detach($user->id);

        if ($user->current_workspace_id === $workspace->id) {
            $fallback = $user->workspaces()->first();
            $user->forceFill(['current_workspace_id' => $fallback?->id])->save();
        }

        return back()->with('success', 'Member removed successfully.');
    }
}
