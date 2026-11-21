<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AuthEvent;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'email',
    'event',
    'ip_address',
    'user_agent',
    'metadata',
    'created_at',
])]
class AuthLog extends Model
{
    use HasFactory, MassPrunable;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'event' => AuthEvent::class,
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subDays(90));
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
