<?php

namespace App\Models;

use App\Enums\MessageDirection;
use App\Enums\MessageSenderType;
use App\Enums\MessageStatus;
use App\Enums\MessageType;
use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'workspace_id',
    'conversation_id',
    'whatsapp_account_id',
    'wamid',
    'direction',
    'sender_type',
    'sent_by_user_id',
    'campaign_id',
    'type',
    'body',
    'media_meta_id',
    'media_path',
    'media_mime_type',
    'payload',
    'context_wamid',
    'status',
    'status_rank',
    'pricing_category',
    'is_billable',
    'error_code',
    'error_message',
    'sent_at',
    'delivered_at',
    'read_at',
    'failed_at',
])]
class Message extends Model
{
    use BelongsToWorkspace, HasFactory;

    protected function casts(): array
    {
        return [
            'direction' => MessageDirection::class,
            'sender_type' => MessageSenderType::class,
            'type' => MessageType::class,
            'status' => MessageStatus::class,
            'status_rank' => 'integer',
            'is_billable' => 'boolean',
            'payload' => 'array',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Conversation, $this>
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * @return BelongsTo<WhatsAppAccount, $this>
     */
    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(WhatsAppAccount::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function sentByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by_user_id');
    }

    /**
     * @return BelongsTo<Campaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /**
     * @return HasOne<CampaignRecipient, $this>
     */
    public function campaignRecipient(): HasOne
    {
        return $this->hasOne(CampaignRecipient::class);
    }
}
