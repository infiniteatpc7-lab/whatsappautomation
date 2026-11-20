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
        Schema::create('messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('whatsapp_account_id')->constrained('whatsapp_accounts')->cascadeOnDelete();
            $table->string('wamid')->nullable()->unique();
            $table->string('direction');
            $table->string('sender_type');
            $table->foreignId('sent_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->string('type');
            $table->text('body')->nullable();
            $table->string('media_meta_id')->nullable();
            $table->string('media_path', 1000)->nullable();
            $table->string('media_mime_type', 100)->nullable();
            $table->json('payload')->nullable();
            $table->string('context_wamid')->nullable()->index();
            $table->string('status')->default('queued');
            $table->unsignedTinyInteger('status_rank')->default(0);
            $table->string('pricing_category')->nullable();
            $table->boolean('is_billable')->default(false);
            $table->string('error_code')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'id']);
            $table->index(['workspace_id', 'created_at']);
            $table->index(['workspace_id', 'pricing_category', 'is_billable', 'created_at'], 'msg_ws_pricing_billable_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
