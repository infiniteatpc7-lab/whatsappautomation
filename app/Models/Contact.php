<?php

namespace App\Models;

use App\Enums\OptInStatus;
use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'workspace_id',
    'wa_id',
    'country_code',
    'name',
    'profile_name',
    'email',
    'company_name',
    'city',
    'state',
    'source',
    'opt_in_status',
    'opt_in_source',
    'opted_in_at',
    'opted_out_at',
    'custom_fields',
])]
class Contact extends Model
{
    use BelongsToWorkspace, HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'opt_in_status' => OptInStatus::class,
            'opted_in_at' => 'datetime',
            'opted_out_at' => 'datetime',
            'custom_fields' => 'array',
        ];
    }

    /**
     * Normalize WhatsApp phone numbers to digits-only E.164.
     */
    public static function normalizeWaId(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?? '';
    }

    /**
     * @return BelongsToMany<Tag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'contact_tag');
    }

    /**
     * @return HasMany<Conversation, $this>
     */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    /**
     * @return HasMany<CampaignRecipient, $this>
     */
    public function campaignRecipients(): HasMany
    {
        return $this->hasMany(CampaignRecipient::class);
    }

    /**
     * @return HasMany<KanbanCard, $this>
     */
    public function kanbanCards(): HasMany
    {
        return $this->hasMany(KanbanCard::class);
    }
}
