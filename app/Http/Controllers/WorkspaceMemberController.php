<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\WorkspaceRole;
use App\Http\Requests\Workspace\AddWorkspaceMemberRequest;
use App\Http\Requests\Workspace\UpdateWorkspaceMemberRequest;
use App\Models\User;
use App\Models\Workspace;
use App\Support\WorkspaceContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        /** @var User $targetUser */
        $targetUser = User::where('email', $validated['email'])->firstOrFail();

        if ($workspace->users()->where('users.id', $targetUser->id)->exists()) {
            throw ValidationException::withMessages([
                'email' => 'User is already a member of this workspace.',
            ]);
        }

        $workspace->users()->attach($targetUser->id, [
            'role' => $validated['role'],
            'is_available' => true,
        ]);

        if (! $targetUser->current_workspace_id) {
            $targetUser->forceFill(['current_workspace_id' => $workspace->id])->save();
        }

        return back()->with('success', "{$targetUser->name} added to workspace.");
    }

    public function update(UpdateWorkspaceMemberRequest $request, User $user): RedirectResponse
    {
        $workspace = $this->getActiveWorkspace($request);
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
