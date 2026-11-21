<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\WorkspaceRole;
use App\Models\User;
use App\Models\Workspace;

class WorkspacePolicy
{
    /**
     * Determine whether the user can view the workspace.
     */
    public function view(User $user, Workspace $workspace): bool
    {
        return $user->workspaces()->where('workspaces.id', $workspace->id)->exists();
    }

    /**
     * Determine whether the user can update the workspace.
     */
    public function update(User $user, Workspace $workspace): bool
    {
        if ($workspace->owner_id === $user->id) {
            return true;
        }

        $member = $workspace->users()->where('users.id', $user->id)->first();
        if (! $member) {
            return false;
        }

        $role = $member->pivot?->role instanceof WorkspaceRole
            ? $member->pivot->role
            : ($member->pivot?->role ? WorkspaceRole::tryFrom((string) $member->pivot->role) : null);

        return $role?->isAdminOrOwner() ?? false;
    }

    /**
     * Determine whether the user can manage workspace members.
     */
    public function manageMembers(User $user, Workspace $workspace): bool
    {
        return $this->update($user, $workspace);
    }

    /**
     * Determine whether the user can manage WhatsApp accounts on the workspace.
     */
    public function manageWhatsAppAccounts(User $user, Workspace $workspace): bool
    {
        if ($workspace->owner_id === $user->id) {
            return true;
        }

        $member = $workspace->users()->where('users.id', $user->id)->first();
        if (! $member) {
            return false;
        }

        $role = $member->pivot?->role instanceof WorkspaceRole
            ? $member->pivot->role
            : ($member->pivot?->role ? WorkspaceRole::tryFrom((string) $member->pivot->role) : null);

        return $role?->canManageWhatsApp() ?? false;
    }
}
