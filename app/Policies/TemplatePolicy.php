<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Template;
use App\Models\User;

class TemplatePolicy
{
    protected function belongsToActiveWorkspace(User $user, int $workspaceId): bool
    {
        return (int) $user->current_workspace_id === (int) $workspaceId
            && $user->workspaces()->where('workspaces.id', $workspaceId)->exists();
    }

    public function viewAny(User $user): bool
    {
        return $user->current_workspace_id !== null
            && $user->workspaces()->where('workspaces.id', $user->current_workspace_id)->exists();
    }

    public function view(User $user, Template $template): bool
    {
        return $this->belongsToActiveWorkspace($user, $template->workspace_id);
    }

    public function create(User $user): bool
    {
        return $user->current_workspace_id !== null
            && $user->workspaces()->where('workspaces.id', $user->current_workspace_id)->exists();
    }

    public function update(User $user, Template $template): bool
    {
        return $this->belongsToActiveWorkspace($user, $template->workspace_id);
    }

    public function delete(User $user, Template $template): bool
    {
        return $this->belongsToActiveWorkspace($user, $template->workspace_id);
    }
}
