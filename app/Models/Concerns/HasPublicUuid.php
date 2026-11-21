<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

trait HasPublicUuid
{
    /**
     * Initialize the trait to automatically populate the uuid attribute upon instantiation.
     */
    public function initializeHasPublicUuid(): void
    {
        if (empty($this->attributes['uuid'])) {
            $this->attributes['uuid'] = (string) Str::uuid();
        }
    }

    /**
     * Boot the trait to automatically populate the uuid attribute.
     */
    public static function bootHasPublicUuid(): void
    {
        static::creating(function (Model $model): void {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Scope a query to find a model by its public UUID.
     */
    public function scopeWhereUuid(Builder $query, string $uuid): Builder
    {
        return $query->where('uuid', $uuid);
    }

    /**
     * Find a model by its public UUID.
     */
    public static function findByUuid(string $uuid): ?static
    {
        return static::where('uuid', $uuid)->first();
    }
}
