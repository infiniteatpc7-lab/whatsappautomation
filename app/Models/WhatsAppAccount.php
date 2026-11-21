<?php

namespace App\Models;

use App\Enums\WhatsAppAccountStatus;
use App\Enums\WhatsAppConnectionType;
use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'workspace_id',
    'connection_type',
    'is_coexistence',
    'business_portfolio_id',
    'waba_id',
    'phone_number_id',
    'display_phone_number',
    'verified_name',
    'access_token',
    'app_secret',
    'webhook_verify_token',
    'quality_rating',
    'messaging_limit_tier',
    'status',
    'last_synced_at',
])]
#[Hidden(['access_token', 'app_secret', 'webhook_verify_token'])]
class WhatsAppAccount extends Model
{
    use BelongsToWorkspace, HasFactory, SoftDeletes;

    protected $table = 'whatsapp_accounts';

    protected function casts(): array
    {
        return [
            'connection_type' => WhatsAppConnectionType::class,
            'status' => WhatsAppAccountStatus::class,
            'is_coexistence' => 'boolean',
            'access_token' => 'encrypted',
            'app_secret' => 'encrypted',
            'last_synced_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<Template, $this>
     */
    public function templates(): HasMany
    {
        return $this->hasMany(Template::class, 'whatsapp_account_id');
    }

    /**
     * @return HasMany<Conversation, $this>
     */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'whatsapp_account_id');
    }

    /**
     * @return HasMany<Campaign, $this>
     */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class, 'whatsapp_account_id');
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'whatsapp_account_id');
    }

    /**
     * @return HasMany<AutomationFlow, $this>
     */
    public function automationFlows(): HasMany
    {
        return $this->hasMany(AutomationFlow::class, 'whatsapp_account_id');
    }
}
