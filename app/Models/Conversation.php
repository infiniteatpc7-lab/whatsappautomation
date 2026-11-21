<?php

namespace App\Models;

use App\Enums\ConversationStatus;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'uuid',
    'workspace_id',
    'whatsapp_account_id',
    'contact_id',
    'assigned_to',
    'status',
    'is_ai_paused',
    'unread_count',
    'last_message_id',
    'last_message_preview',
    'last_message_at',
    'last_inbound_at',
    'window_expires_at',
    'free_entry_expires_at',
])]
class Conversation extends Model
{
    use BelongsToWorkspace, HasFactory, HasPublicUuid;

    protected function casts(): array
    {
        return [
            'status' => ConversationStatus::class,
            'is_ai_paused' => 'boolean',
            'unread_count' => 'integer',
            'last_message_at' => 'datetime',
            'last_inbound_at' => 'datetime',
            'window_expires_at' => 'datetime',
            'free_entry_expires_at' => 'datetime',
        ];
    }

    /**
     * Determine whether the Meta 24-hour customer service window is open.
     */
    public function isWindowOpen(): bool
    {
        return $this->window_expires_at !== null && $this->window_expires_at->isFuture();
    }

    /**
     * Determine whether free-tier entry point window is active.
     */
    public function isFreeEntryActive(): bool
    {
        return $this->free_entry_expires_at !== null && $this->free_entry_expires_at->isFuture();
    }

    /**
     * @return BelongsTo<WhatsAppAccount, $this>
     */
    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(WhatsAppAccount::class, 'whatsapp_account_id');
    }

    /**
     * @return BelongsTo<Contact, $this>
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * @return BelongsTo<Message, $this>
     */
    public function lastMessage(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'last_message_id');
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * @return HasMany<ConversationNote, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(ConversationNote::class);
    }

    /**
     * @return HasMany<KanbanCard, $this>
     */
    public function kanbanCards(): HasMany
    {
        return $this->hasMany(KanbanCard::class);
    }
}
