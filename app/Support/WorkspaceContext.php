<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Workspace;

class WorkspaceContext
{
    protected ?Workspace $workspace = null;

    public function setWorkspace(?Workspace $workspace): void
    {
        $this->workspace = $workspace;
    }

    public function getWorkspace(): ?Workspace
    {
        return $this->workspace;
    }

    public function getId(): ?int
    {
        return $this->workspace?->id;
    }

    public function hasWorkspace(): bool
    {
        return $this->workspace !== null;
    }
}
