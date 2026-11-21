<?php

namespace App\Models;

use App\Enums\CampaignStatus;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'uuid',
    'workspace_id',
    'whatsapp_account_id',
    'template_id',
    'created_by',
    'name',
    'status',
    'variable_mapping',
    'header_media_url',
    'audience_filter',
    'scheduled_at',
    'started_at',
    'completed_at',
    'total_recipients',
    'sent_count',
    'delivered_count',
    'read_count',
    'failed_count',
    'replied_count',
])]
class Campaign extends Model
{
    use BelongsToWorkspace, HasFactory, HasPublicUuid, SoftDeletes;

    protected function casts(): array
    {
        return [
            'status' => CampaignStatus::class,
            'variable_mapping' => 'array',
            'audience_filter' => 'array',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'total_recipients' => 'integer',
            'sent_count' => 'integer',
            'delivered_count' => 'integer',
            'read_count' => 'integer',
            'failed_count' => 'integer',
            'replied_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<WhatsAppAccount, $this>
     */
    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(WhatsAppAccount::class, 'whatsapp_account_id');
    }

    /**
     * @return BelongsTo<Template, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(Template::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<CampaignRecipient, $this>
     */
    public function recipients(): HasMany
    {
        return $this->hasMany(CampaignRecipient::class);
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
