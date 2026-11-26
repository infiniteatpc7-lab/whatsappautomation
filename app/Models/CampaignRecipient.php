<?php

namespace App\Models;

use App\Enums\CampaignStatus;
use App\Enums\RecipientStatus;
use App\Jobs\SendCampaignMessageJob;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'campaign_id',
    'contact_id',
    'message_id',
    'wamid',
    'resolved_variables',
    'status',
    'error_code',
    'error_message',
    'retry_count',
    'next_retry_at',
    'sent_at',
    'delivered_at',
    'read_at',
    'clicked_at',
])]
class CampaignRecipient extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'status' => RecipientStatus::class,
            'resolved_variables' => 'array',
            'retry_count' => 'integer',
            'next_retry_at' => 'datetime',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
            'clicked_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Campaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /**
     * @return BelongsTo<Contact, $this>
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * @return BelongsTo<Message, $this>
     */
    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    /**
     * Schedule an automatic Smart Sender retry if the failure is retryable and within the campaign's retry window.
     */
    public function scheduleSmartRetry(?string $errorCode): bool
    {
        $campaign = $this->campaign;
        if (! $campaign || ! $campaign->smart_sender_enabled) {
            return false;
        }

        $retryableCodes = ['131049', '130429', '131056', '131000', '131016'];
        if (! $errorCode || ! in_array($errorCode, $retryableCodes, true)) {
            return false;
        }

        if ((int) $this->retry_count >= 3) {
            return false;
        }

        $windowHours = max(1, min(72, (int) $campaign->retry_window_hours));
        $anchor = $campaign->started_at ?? $campaign->created_at ?? now();
        $deadline = $anchor->copy()->addHours($windowHours);

        $delayMinutes = $errorCode === '131049'
            ? 12 * 60
            : 15 * ((int) $this->retry_count + 1);

        $nextRetryAt = now()->addMinutes($delayMinutes);
        if ($nextRetryAt->greaterThan($deadline)) {
            return false;
        }

        $this->update([
            'status' => RecipientStatus::QUEUED,
            'retry_count' => (int) $this->retry_count + 1,
            'next_retry_at' => $nextRetryAt,
            'error_code' => $errorCode,
        ]);

        if ($campaign->status === CampaignStatus::COMPLETED) {
            $campaign->update(['status' => CampaignStatus::PROCESSING]);
        }

        SendCampaignMessageJob::dispatch($this->id)
            ->delay($nextRetryAt)
            ->onQueue('broadcasts');

        return true;
    }
}
