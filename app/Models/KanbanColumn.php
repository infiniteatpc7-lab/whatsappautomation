<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['board_id', 'title', 'position', 'color', 'auto_template_id'])]
class KanbanColumn extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<KanbanBoard, $this>
     */
    public function board(): BelongsTo
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    /**
     * @return BelongsTo<Template, $this>
     */
    public function autoTemplate(): BelongsTo
    {
        return $this->belongsTo(Template::class, 'auto_template_id');
    }

    /**
     * @return HasMany<KanbanCard, $this>
     */
    public function cards(): HasMany
    {
        return $this->hasMany(KanbanCard::class, 'column_id')->orderBy('position');
    }
}
