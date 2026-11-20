<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ai_agents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('name');
            $table->string('provider')->default('gemini');
            $table->string('model')->default('gemini-2.5-flash');
            $table->text('system_prompt')->nullable();
            $table->json('handoff_keywords')->nullable();
            $table->boolean('transcribe_voice_notes')->default(true);
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        Schema::create('ai_knowledge_sources', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('ai_agent_id')->constrained('ai_agents')->cascadeOnDelete();
            $table->string('type');
            $table->string('title');
            $table->string('file_path', 1000)->nullable();
            $table->string('source_url', 1000)->nullable();
            $table->longText('extracted_text')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_knowledge_sources');
        Schema::dropIfExists('ai_agents');
    }
};
