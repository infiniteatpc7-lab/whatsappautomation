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
        Schema::create('whatsapp_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('connection_type')->default('manual');
            $table->boolean('is_coexistence')->default(false);
            $table->string('business_portfolio_id')->nullable();
            $table->string('waba_id')->index();
            $table->string('phone_number_id')->unique();
            $table->string('display_phone_number');
            $table->string('verified_name');
            $table->text('access_token');
            $table->text('app_secret')->nullable();
            $table->string('webhook_verify_token');
            $table->string('quality_rating')->default('UNKNOWN');
            $table->string('messaging_limit_tier')->nullable();
            $table->string('status')->default('connected');
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_accounts');
    }
};
