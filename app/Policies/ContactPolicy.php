<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;

class ContactPolicy
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

    public function view(User $user, Contact $contact): bool
    {
        return $this->belongsToActiveWorkspace($user, $contact->workspace_id);
    }

    public function create(User $user): bool
    {
        return $user->current_workspace_id !== null;
    }

    public function update(User $user, Contact $contact): bool
    {
        return $this->belongsToActiveWorkspace($user, $contact->workspace_id);
    }

    public function delete(User $user, Contact $contact): bool
    {
        return $this->belongsToActiveWorkspace($user, $contact->workspace_id);
    }
}
