<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->boolean('smart_sender_enabled')->default(false)->after('audience_filter');
            $table->unsignedTinyInteger('retry_window_hours')->default(36)->after('smart_sender_enabled');
        });

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->unsignedTinyInteger('retry_count')->default(0)->after('error_message');
            $table->timestamp('next_retry_at')->nullable()->after('retry_count');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['smart_sender_enabled', 'retry_window_hours']);
        });

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->dropColumn(['retry_count', 'next_retry_at']);
        });
    }
};
