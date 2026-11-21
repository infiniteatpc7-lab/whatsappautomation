<?php

namespace App\Models;

use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'workspace_id',
    'whatsapp_account_id',
    'meta_template_id',
    'name',
    'language',
    'category',
    'previous_category',
    'status',
    'rejected_reason',
    'header_type',
    'body_text',
    'components',
    'last_synced_at',
])]
class Template extends Model
{
    use BelongsToWorkspace, HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'category' => TemplateCategory::class,
            'status' => TemplateStatus::class,
            'components' => 'array',
            'last_synced_at' => 'datetime',
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
     * @return HasMany<Campaign, $this>
     */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    /**
     * @return HasMany<KanbanColumn, $this>
     */
    public function kanbanColumns(): HasMany
    {
        return $this->hasMany(KanbanColumn::class, 'auto_template_id');
    }
}
