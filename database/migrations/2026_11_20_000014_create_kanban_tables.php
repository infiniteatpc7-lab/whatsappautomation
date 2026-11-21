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
        Schema::create('kanban_boards', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->default('leads');
            $table->timestamps();
        });

        Schema::create('kanban_columns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('board_id')->constrained('kanban_boards')->cascadeOnDelete();
            $table->string('title');
            $table->integer('position')->default(0);
            $table->string('color')->nullable();
            $table->foreignId('auto_template_id')->nullable()->constrained('templates')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('kanban_cards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('board_id')->constrained('kanban_boards')->cascadeOnDelete();
            $table->foreignId('column_id')->constrained('kanban_columns')->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained('conversations')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('deal_value', 12, 2)->nullable();
            $table->integer('position')->default(0);
            $table->timestamp('due_at')->nullable();
            $table->timestamps();

            $table->index(['column_id', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kanban_cards');
        Schema::dropIfExists('kanban_columns');
        Schema::dropIfExists('kanban_boards');
    }
};
