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
        Schema::create('conversations', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('whatsapp_account_id')->constrained('whatsapp_accounts')->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained('contacts')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('open');
            $table->boolean('is_ai_paused')->default(false);
            $table->unsignedInteger('unread_count')->default(0);
            $table->unsignedBigInteger('last_message_id')->nullable()->index();
            $table->string('last_message_preview', 500)->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamp('last_inbound_at')->nullable();
            $table->timestamp('window_expires_at')->nullable();
            $table->timestamp('free_entry_expires_at')->nullable();
            $table->timestamps();

            $table->unique(['whatsapp_account_id', 'contact_id']);
            $table->index(['workspace_id', 'status', 'last_message_at']);
            $table->index(['workspace_id', 'assigned_to', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
