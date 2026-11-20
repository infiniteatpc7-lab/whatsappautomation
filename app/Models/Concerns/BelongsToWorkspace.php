<?php

namespace App\Models\Concerns;

use App\Models\Workspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToWorkspace
{
    /**
     * Boot the trait to automatically assign workspace_id if available.
     * Note: No global scope is registered so jobs and webhook handlers are never silently scoped.
     */
    protected static function bootBelongsToWorkspace(): void
    {
        static::creating(function ($model): void {
            if (empty($model->workspace_id) && auth()->check() && auth()->user()->current_workspace_id) {
                $model->workspace_id = auth()->user()->current_workspace_id;
            }
        });
    }

    /**
     * Get the workspace that owns the model.
     *
     * @return BelongsTo<Workspace, $this>
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * Scope a query to only include records of a given workspace.
     */
    public function scopeForWorkspace(Builder $query, Workspace|int|string $workspace): Builder
    {
        $id = $workspace instanceof Workspace ? $workspace->id : $workspace;

        return $query->where($this->getTable().'.workspace_id', $id);
    }
}
