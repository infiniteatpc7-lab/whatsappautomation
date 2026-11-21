<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\KanbanBoard;
use App\Models\User;

class KanbanBoardPolicy
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

    public function view(User $user, KanbanBoard $board): bool
    {
        return $this->belongsToActiveWorkspace($user, $board->workspace_id);
    }

    public function create(User $user): bool
    {
        return $user->current_workspace_id !== null
            && $user->workspaces()->where('workspaces.id', $user->current_workspace_id)->exists();
    }

    public function update(User $user, KanbanBoard $board): bool
    {
        return $this->belongsToActiveWorkspace($user, $board->workspace_id);
    }

    public function delete(User $user, KanbanBoard $board): bool
    {
        return $this->belongsToActiveWorkspace($user, $board->workspace_id);
    }
}
