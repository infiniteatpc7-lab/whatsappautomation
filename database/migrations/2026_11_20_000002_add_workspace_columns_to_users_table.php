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
        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('current_workspace_id')->nullable()->after('id')->constrained('workspaces')->nullOnDelete();
            $table->string('phone', 25)->nullable()->after('email');
            $table->string('avatar_url', 500)->nullable()->after('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropForeign(['current_workspace_id']);
            $table->dropColumn(['current_workspace_id', 'phone', 'avatar_url']);
        });
    }
};
