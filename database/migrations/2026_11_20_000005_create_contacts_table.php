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
        Schema::create('contacts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('wa_id', 25);
            $table->string('country_code', 5)->nullable();
            $table->string('name')->nullable();
            $table->string('profile_name')->nullable();
            $table->string('email')->nullable();
            $table->string('company_name')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('source')->default('manual');
            $table->string('opt_in_status')->default('unknown');
            $table->string('opt_in_source')->nullable();
            $table->timestamp('opted_in_at')->nullable();
            $table->timestamp('opted_out_at')->nullable();
            $table->json('custom_fields')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['workspace_id', 'wa_id']);
            $table->index(['workspace_id', 'opt_in_status']);
            $table->index(['workspace_id', 'city']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
