<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->unsignedInteger('clicks_count')->default(0)->after('replied_count');
        });

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->timestamp('clicked_at')->nullable()->after('read_at');
        });

        Schema::create('campaign_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->cascadeOnDelete();
            $table->foreignId('campaign_recipient_id')->nullable()->constrained('campaign_recipients')->cascadeOnDelete();
            $table->string('token', 32)->unique();
            $table->string('target_url', 2000);
            $table->unsignedInteger('clicks')->default(0);
            $table->timestamp('last_clicked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_links');

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->dropColumn('clicked_at');
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('clicks_count');
        });
    }
};
