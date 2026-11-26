<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\CampaignStatus;
use App\Enums\MessageDirection;
use App\Enums\RecipientStatus;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Message;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class DispatchCampaignJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public int $campaignId)
    {
        $this->onQueue('broadcasts');
    }

    public function handle(): void
    {
        $campaign = Campaign::find($this->campaignId);
        if (! $campaign) {
            return;
        }

        if (! in_array($campaign->status, [CampaignStatus::SCHEDULED, CampaignStatus::PROCESSING], true)) {
            return;
        }

        if ($campaign->status === CampaignStatus::SCHEDULED) {
            $remainingQuota = $this->remainingDailyQuota($campaign);
            if ($remainingQuota !== null && $remainingQuota <= 0) {
                $campaign->update(['status' => CampaignStatus::PAUSED]);

                return;
            }

            $campaign->update([
                'status' => CampaignStatus::PROCESSING,
                'started_at' => $campaign->started_at ?? now(),
            ]);
        }

        CampaignRecipient::query()
            ->where('campaign_id', $campaign->id)
            ->where('status', RecipientStatus::PENDING)
            ->chunkById(100, function ($recipients) use ($campaign): bool {
                $freshStatus = $campaign->fresh()?->status;
                if ($freshStatus !== CampaignStatus::PROCESSING) {
                    return false;
                }

                $ids = $recipients->pluck('id')->all();
                CampaignRecipient::query()
                    ->whereIn('id', $ids)
                    ->update(['status' => RecipientStatus::QUEUED->value]);

                foreach ($recipients as $recipient) {
                    SendCampaignMessageJob::dispatch($recipient->id)->onQueue('broadcasts');
                }

                return true;
            });
    }

    protected function remainingDailyQuota(Campaign $campaign): ?int
    {
        $tier = $campaign->whatsappAccount?->messaging_limit_tier;
        $dailyLimit = match ($tier) {
            'TIER_50' => 50,
            'TIER_250' => 250,
            'TIER_1K' => 1000,
            'TIER_2K' => 2000,
            'TIER_10K' => 10000,
            'TIER_100K' => 100000,
            default => null,
        };

        if ($dailyLimit === null) {
            return null;
        }

        $sentToday = (int) Message::query()
            ->join('conversations', 'messages.conversation_id', '=', 'conversations.id')
            ->where('messages.whatsapp_account_id', $campaign->whatsapp_account_id)
            ->where('messages.direction', MessageDirection::OUTBOUND)
            ->where('messages.created_at', '>=', now()->subHours(24))
            ->distinct('conversations.contact_id')
            ->count('conversations.contact_id');

        return max(0, $dailyLimit - $sentToday);
    }
}
