<?php

namespace App\Models;

use App\Enums\WorkspacePlan;
use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['uuid', 'owner_id', 'name', 'slug', 'timezone', 'plan', 'settings'])]
class Workspace extends Model
{
    use HasFactory, HasPublicUuid, SoftDeletes;

    protected function casts(): array
    {
        return [
            'plan' => WorkspacePlan::class,
            'settings' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'workspace_user')
            ->using(WorkspaceUser::class)
            ->withPivot(['role', 'is_available'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<WhatsAppAccount, $this>
     */
    public function whatsappAccounts(): HasMany
    {
        return $this->hasMany(WhatsAppAccount::class);
    }

    /**
     * @return HasMany<Contact, $this>
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    /**
     * @return HasMany<Tag, $this>
     */
    public function tags(): HasMany
    {
        return $this->hasMany(Tag::class);
    }

    /**
     * @return HasMany<Template, $this>
     */
    public function templates(): HasMany
    {
        return $this->hasMany(Template::class);
    }

    /**
     * @return HasMany<Campaign, $this>
     */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    /**
     * @return HasMany<Conversation, $this>
     */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    /**
     * @return HasMany<KanbanBoard, $this>
     */
    public function kanbanBoards(): HasMany
    {
        return $this->hasMany(KanbanBoard::class);
    }

    /**
     * @return HasMany<AutomationFlow, $this>
     */
    public function automationFlows(): HasMany
    {
        return $this->hasMany(AutomationFlow::class);
    }

    /**
     * @return HasMany<AiAgent, $this>
     */
    public function aiAgents(): HasMany
    {
        return $this->hasMany(AiAgent::class);
    }

    /**
     * @return HasMany<WorkspaceInvitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(WorkspaceInvitation::class);
    }
}
