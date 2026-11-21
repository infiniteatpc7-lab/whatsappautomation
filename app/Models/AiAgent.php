<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'workspace_id',
    'name',
    'provider',
    'model',
    'system_prompt',
    'handoff_keywords',
    'transcribe_voice_notes',
    'is_active',
])]
class AiAgent extends Model
{
    use BelongsToWorkspace, HasFactory;

    protected function casts(): array
    {
        return [
            'handoff_keywords' => 'array',
            'transcribe_voice_notes' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<AiKnowledgeSource, $this>
     */
    public function knowledgeSources(): HasMany
    {
        return $this->hasMany(AiKnowledgeSource::class, 'ai_agent_id');
    }
}
