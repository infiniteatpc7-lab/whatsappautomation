<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\CampaignStatus;
use App\Enums\ConversationStatus;
use App\Enums\MessageDirection;
use App\Enums\MessageSenderType;
use App\Enums\MessageStatus;
use App\Enums\MessageType;
use App\Enums\OptInStatus;
use App\Enums\RecipientStatus;
use App\Exceptions\MetaApiException;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\WhatsApp\MetaCloudClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class SendCampaignMessageJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 50;

    public int $maxExceptions = 5;

    public function __construct(public int $campaignRecipientId)
    {
        $this->onQueue('broadcasts');
    }

    public function handle(MetaCloudClient $metaClient): void
    {
        $recipient = CampaignRecipient::query()
            ->with(['campaign.whatsappAccount', 'campaign.template', 'contact'])
            ->find($this->campaignRecipientId);

        if (! $recipient || ! $recipient->campaign || ! $recipient->contact) {
            return;
        }

        $campaign = $recipient->campaign;
        $contact = $recipient->contact;
        $account = $campaign->whatsappAccount;
        $template = $campaign->template;

        if (! in_array($recipient->status, [RecipientStatus::PENDING, RecipientStatus::QUEUED], true)) {
            return;
        }

        if ($campaign->status !== CampaignStatus::PROCESSING) {
            return;
        }

        if ($recipient->next_retry_at && $recipient->next_retry_at->isFuture()) {
            $this->release($recipient->next_retry_at);

            return;
        }

        if ($contact->opt_in_status === OptInStatus::OPTED_OUT) {
            $recipient->update(['status' => RecipientStatus::SKIPPED]);
            $this->completeCampaignIfFinished($campaign);

            return;
        }

        if (! $account || ! $template) {
            $this->markFailed($campaign, $recipient, 'CONFIG', 'Missing WhatsApp account or template.');

            return;
        }

        // Per-phone-number rate limiter (20 MPS baseline, safe for both standard & coexistence numbers)
        $allowed = RateLimiter::attempt(
            "wa_broadcast:{$account->phone_number_id}",
            20,
            static fn (): bool => true,
            1
        );

        if (! $allowed) {
            $this->release(1);

            return;
        }

        [$components, $resolvedVars, $renderedBody] = $this->resolveTemplatePayload($campaign, $contact);

        try {
            $metaResponse = $metaClient->sendTemplateMessage(
                $account,
                $contact->wa_id,
                $template->name,
                $template->language,
                $components
            );

            $wamid = (string) ($metaResponse['messages'][0]['id'] ?? Str::uuid()->toString());

            $conversation = Conversation::firstOrCreate(
                [
                    'workspace_id' => $campaign->workspace_id,
                    'whatsapp_account_id' => $account->id,
                    'contact_id' => $contact->id,
                ],
                [
                    'status' => ConversationStatus::OPEN,
                ]
            );

            $message = Message::create([
                'workspace_id' => $campaign->workspace_id,
                'conversation_id' => $conversation->id,
                'whatsapp_account_id' => $account->id,
                'campaign_id' => $campaign->id,
                'wamid' => $wamid,
                'direction' => MessageDirection::OUTBOUND,
                'sender_type' => MessageSenderType::CAMPAIGN,
                'sent_by_user_id' => $campaign->created_by,
                'type' => MessageType::TEMPLATE,
                'body' => $renderedBody,
                'payload' => [
                    'template_name' => $template->name,
                    'language' => $template->language,
                    'components' => $components,
                ],
                'status' => MessageStatus::SENT,
                'status_rank' => MessageStatus::SENT->rank(),
                'sent_at' => now(),
            ]);

            $conversation->update([
                'last_message_id' => $message->id,
                'last_message_preview' => Str::limit($renderedBody, 120),
                'last_message_at' => now(),
            ]);

            $recipient->update([
                'message_id' => $message->id,
                'wamid' => $wamid,
                'resolved_variables' => $resolvedVars,
                'status' => RecipientStatus::SENT,
                'sent_at' => now(),
            ]);

            $campaign->increment('sent_count');
            $this->completeCampaignIfFinished($campaign);
        } catch (MetaApiException $e) {
            $code = $e->metaErrorCode ? (string) $e->metaErrorCode : null;

            // 130429 / HTTP 429: transient throughput rate limit -> retry with backoff
            if ($e->metaErrorCode === 130429 || $e->httpStatus === 429) {
                $this->release(60);

                return;
            }

            // 131048: spam rate limit hit -> auto-pause campaign to protect phone quality
            if ($e->metaErrorCode === 131048) {
                $campaign->update(['status' => CampaignStatus::PAUSED]);
                $this->markFailed($campaign, $recipient, $code, $e->getMessage());

                return;
            }

            // Smart Sender auto-retry for retryable Meta errors (e.g. 131049, 131056, 131000)
            if ($recipient->scheduleSmartRetry($code)) {
                $recipient->update(['error_message' => Str::limit($e->getMessage(), 500)]);

                return;
            }

            $this->markFailed($campaign, $recipient, $code, $e->getMessage());
        } catch (\Throwable $e) {
            $this->markFailed($campaign, $recipient, null, $e->getMessage());
        }
    }

    /**
     * Resolve template header, body, and URL button parameters from campaign mapping + contact attributes.
     *
     * @return array{0: array<int, array<string, mixed>>, 1: array<string, string>, 2: string}
     */
    protected function resolveTemplatePayload(Campaign $campaign, Contact $contact): array
    {
        $template = $campaign->template;
        $mapping = $campaign->variable_mapping ?? [];
        $templateComponents = $template?->components ?? [];
        $bodyText = (string) ($template?->body_text ?? '');

        $resolveValue = static function (string $key, string $defaultFallback = 'Customer') use ($mapping, $contact): string {
            $rule = $mapping[$key] ?? ['source' => 'contact_name', 'fallback' => $defaultFallback];
            $source = (string) ($rule['source'] ?? 'static');
            $fallback = (string) ($rule['fallback'] ?? $defaultFallback);

            if (str_starts_with($source, 'csv:')) {
                $csvKey = substr($source, 4);
                $customVal = trim((string) ($contact->custom_fields[$csvKey] ?? ''));

                return $customVal !== '' ? $customVal : $fallback;
            }

            return match ($source) {
                'contact_name' => $contact->name ?: ($contact->profile_name ?: $fallback),
                'company_name' => $contact->company_name ?: $fallback,
                'city' => $contact->city ?: $fallback,
                'state' => $contact->state ?: $fallback,
                'phone' => '+' . $contact->wa_id,
                default => $fallback !== '' ? $fallback : $defaultFallback,
            };
        };

        $components = [];
        $resolvedVars = [];

        // 1. Header component (Text variable or Media URL)
        $headerComp = collect($templateComponents)->firstWhere('type', 'HEADER');
        if (is_array($headerComp)) {
            $format = strtoupper((string) ($headerComp['format'] ?? 'TEXT'));
            if ($format === 'TEXT' && str_contains((string) ($headerComp['text'] ?? ''), '{{1}}')) {
                $val = $resolveValue('header_1', 'Update');
                $resolvedVars['header_1'] = $val;
                $components[] = [
                    'type' => 'header',
                    'parameters' => [['type' => 'text', 'text' => $val]],
                ];
            } elseif (in_array($format, ['IMAGE', 'VIDEO', 'DOCUMENT'], true) && $campaign->header_media_url) {
                $mediaKey = strtolower($format);
                $components[] = [
                    'type' => 'header',
                    'parameters' => [[
                        'type' => $mediaKey,
                        $mediaKey => ['link' => $campaign->header_media_url],
                    ]],
                ];
            }
        }

        // 2. Body component parameters
        preg_match_all('/\{\{(\d+)\}\}/', $bodyText, $matches);
        $varNums = array_values(array_unique($matches[1] ?? []));
        sort($varNums, SORT_NUMERIC);

        $bodyParams = [];
        $renderedBody = $bodyText;

        foreach ($varNums as $varNum) {
            $key = (string) $varNum;
            $value = $resolveValue($key);
            $resolvedVars[$key] = $value;
            $bodyParams[] = [
                'type' => 'text',
                'text' => $value,
            ];
            $renderedBody = str_replace("{{{$key}}}", $value, $renderedBody);
        }

        if ($bodyParams !== []) {
            $components[] = [
                'type' => 'body',
                'parameters' => $bodyParams,
            ];
        }

        // 3. Dynamic URL button parameters
        $buttonsComp = collect($templateComponents)->firstWhere('type', 'BUTTONS');
        if (is_array($buttonsComp) && ! empty($buttonsComp['buttons'])) {
            foreach ($buttonsComp['buttons'] as $idx => $btn) {
                if (strtoupper((string) ($btn['type'] ?? '')) === 'URL' && str_contains((string) ($btn['url'] ?? ''), '{{1}}')) {
                    $btnKey = "button_{$idx}";
                    $val = $resolveValue($btnKey, 'view');
                    $resolvedVars[$btnKey] = $val;
                    $components[] = [
                        'type' => 'button',
                        'sub_type' => 'url',
                        'index' => (string) $idx,
                        'parameters' => [['type' => 'text', 'text' => $val]],
                    ];
                }
            }
        }

        return [$components, $resolvedVars, $renderedBody];
    }

    protected function markFailed(
        Campaign $campaign,
        CampaignRecipient $recipient,
        ?string $errorCode,
        string $errorMessage
    ): void {
        $recipient->update([
            'status' => RecipientStatus::FAILED,
            'error_code' => $errorCode,
            'error_message' => Str::limit($errorMessage, 500),
        ]);

        $campaign->increment('failed_count');
        $this->completeCampaignIfFinished($campaign);
    }

    protected function completeCampaignIfFinished(Campaign $campaign): void
    {
        $remaining = CampaignRecipient::query()
            ->where('campaign_id', $campaign->id)
            ->whereIn('status', [RecipientStatus::PENDING, RecipientStatus::QUEUED])
            ->exists();

        if (! $remaining && $campaign->fresh()?->status === CampaignStatus::PROCESSING) {
            $campaign->update([
                'status' => CampaignStatus::COMPLETED,
                'completed_at' => now(),
            ]);
        }
    }
}
