<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['uuid', 'workspace_id', 'name', 'type'])]
class KanbanBoard extends Model
{
    use BelongsToWorkspace, HasFactory, HasPublicUuid;

    /**
     * @return HasMany<KanbanColumn, $this>
     */
    public function columns(): HasMany
    {
        return $this->hasMany(KanbanColumn::class, 'board_id')->orderBy('position');
    }

    /**
     * @return HasMany<KanbanCard, $this>
     */
    public function cards(): HasMany
    {
        return $this->hasMany(KanbanCard::class, 'board_id');
    }
}
