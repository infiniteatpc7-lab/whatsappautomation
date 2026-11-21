<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'workspace_id',
    'ai_agent_id',
    'type',
    'title',
    'file_path',
    'source_url',
    'extracted_text',
    'status',
])]
class AiKnowledgeSource extends Model
{
    use BelongsToWorkspace, HasFactory;

    /**
     * @return BelongsTo<AiAgent, $this>
     */
    public function aiAgent(): BelongsTo
    {
        return $this->belongsTo(AiAgent::class, 'ai_agent_id');
    }
}
