<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    protected function belongsToActiveWorkspace(User $user, int $workspaceId): bool
    {
        return (int) $user->current_workspace_id === (int) $workspaceId
            && $user->workspaces()->where('workspaces.id', $workspaceId)->exists();
    }

    public function viewAny(User $user): bool
    {
        return $user->current_workspace_id !== null;
    }

    public function view(User $user, Conversation $conversation): bool
    {
        return $this->belongsToActiveWorkspace($user, $conversation->workspace_id);
    }

    public function reply(User $user, Conversation $conversation): bool
    {
        return $this->belongsToActiveWorkspace($user, $conversation->workspace_id);
    }

    public function assign(User $user, Conversation $conversation): bool
    {
        return $this->belongsToActiveWorkspace($user, $conversation->workspace_id);
    }

    public function updateStatus(User $user, Conversation $conversation): bool
    {
        return $this->belongsToActiveWorkspace($user, $conversation->workspace_id);
    }
}
