<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Campaign;
use App\Models\User;

class CampaignPolicy
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

    public function view(User $user, Campaign $campaign): bool
    {
        return $this->belongsToActiveWorkspace($user, $campaign->workspace_id);
    }

    public function create(User $user): bool
    {
        return $user->current_workspace_id !== null;
    }

    public function update(User $user, Campaign $campaign): bool
    {
        return $this->belongsToActiveWorkspace($user, $campaign->workspace_id);
    }

    public function delete(User $user, Campaign $campaign): bool
    {
        return $this->belongsToActiveWorkspace($user, $campaign->workspace_id);
    }

    public function launch(User $user, Campaign $campaign): bool
    {
        return $this->belongsToActiveWorkspace($user, $campaign->workspace_id);
    }
}
