<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'workspace_id',
    'whatsapp_account_id',
    'name',
    'trigger_type',
    'trigger_config',
    'nodes',
    'edges',
    'is_active',
    'runs_count',
])]
class AutomationFlow extends Model
{
    use BelongsToWorkspace, HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'trigger_config' => 'array',
            'nodes' => 'array',
            'edges' => 'array',
            'is_active' => 'boolean',
            'runs_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<WhatsAppAccount, $this>
     */
    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(WhatsAppAccount::class, 'whatsapp_account_id');
    }
}
