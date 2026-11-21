<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\WorkspaceRole;
use App\Models\User;
use App\Models\WhatsAppAccount;

class WhatsAppAccountPolicy
{
    protected function belongsToActiveWorkspace(User $user, int $workspaceId): bool
    {
        return (int) $user->current_workspace_id === (int) $workspaceId
            && $user->workspaces()->where('workspaces.id', $workspaceId)->exists();
    }

    protected function getRole(User $user, int $workspaceId): ?WorkspaceRole
    {
        $member = $user->workspaces()->where('workspaces.id', $workspaceId)->first();
        if (! $member) {
            return null;
        }

        return $member->pivot?->role instanceof WorkspaceRole
            ? $member->pivot->role
            : ($member->pivot?->role ? WorkspaceRole::tryFrom((string) $member->pivot->role) : null);
    }

    public function viewAny(User $user): bool
    {
        return $user->current_workspace_id !== null;
    }

    public function view(User $user, WhatsAppAccount $account): bool
    {
        return $this->belongsToActiveWorkspace($user, $account->workspace_id);
    }

    public function create(User $user): bool
    {
        if (! $user->current_workspace_id) {
            return false;
        }

        $role = $this->getRole($user, $user->current_workspace_id);

        return $role?->canManageWhatsApp() ?? false;
    }

    public function update(User $user, WhatsAppAccount $account): bool
    {
        if (! $this->belongsToActiveWorkspace($user, $account->workspace_id)) {
            return false;
        }

        $role = $this->getRole($user, $account->workspace_id);

        return $role?->canManageWhatsApp() ?? false;
    }

    public function delete(User $user, WhatsAppAccount $account): bool
    {
        if (! $this->belongsToActiveWorkspace($user, $account->workspace_id)) {
            return false;
        }

        $role = $this->getRole($user, $account->workspace_id);

        return $role?->isAdminOrOwner() ?? false;
    }
}
