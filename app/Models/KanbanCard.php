<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'workspace_id',
    'board_id',
    'column_id',
    'contact_id',
    'conversation_id',
    'assigned_to',
    'title',
    'description',
    'deal_value',
    'position',
    'due_at',
])]
class KanbanCard extends Model
{
    use BelongsToWorkspace, HasFactory;

    protected function casts(): array
    {
        return [
            'deal_value' => 'decimal:2',
            'position' => 'integer',
            'due_at' => 'datetime',
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
     * @return BelongsTo<KanbanColumn, $this>
     */
    public function column(): BelongsTo
    {
        return $this->belongsTo(KanbanColumn::class, 'column_id');
    }

    /**
     * @return BelongsTo<Contact, $this>
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    /**
     * @return BelongsTo<Conversation, $this>
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'conversation_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
