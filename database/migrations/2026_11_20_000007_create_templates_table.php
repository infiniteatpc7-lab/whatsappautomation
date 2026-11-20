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
        Schema::create('templates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('whatsapp_account_id')->constrained('whatsapp_accounts')->cascadeOnDelete();
            $table->string('meta_template_id')->nullable()->index();
            $table->string('name');
            $table->string('language')->default('en');
            $table->string('category');
            $table->string('previous_category')->nullable();
            $table->string('status')->default('DRAFT');
            $table->text('rejected_reason')->nullable();
            $table->string('header_type')->default('NONE');
            $table->text('body_text')->nullable();
            $table->json('components')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['whatsapp_account_id', 'name', 'language']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('templates');
    }
};
