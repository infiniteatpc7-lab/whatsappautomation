<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\ConversationStatus;
use App\Enums\MessageDirection;
use App\Enums\MessageSenderType;
use App\Enums\MessageStatus;
use App\Enums\MessageType;
use App\Enums\OptInStatus;
use App\Enums\RecipientStatus;
use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Template;
use App\Models\WebhookLog;
use App\Models\WhatsAppAccount;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class ProcessWhatsAppWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [10, 30, 60];
    }

    public function __construct(public int $webhookLogId) {}

    public function handle(): void
    {
        /** @var WebhookLog|null $webhookLog */
        $webhookLog = WebhookLog::find($this->webhookLogId);

        if (! $webhookLog || $webhookLog->processed) {
            return;
        }

        $payload = $webhookLog->payload ?? [];

        foreach ($payload['entry'] ?? [] as $entry) {
            $wabaId = (string) ($entry['id'] ?? '');

            foreach ($entry['changes'] ?? [] as $change) {
                $field = $change['field'] ?? null;
                $value = $change['value'] ?? [];

                if ($field === 'messages') {
                    $this->processMessagesField($value, $webhookLog);
                } elseif ($field === 'message_template_status_update') {
                    $this->processTemplateStatusUpdate($value, $wabaId);
                } elseif ($field === 'message_template_category_update') {
                    $this->processTemplateCategoryUpdate($value, $wabaId);
                }
            }
        }

        $webhookLog->update(['processed' => true]);
    }

    /**
     * Process 'messages' field (both incoming messages and outgoing status updates).
     *
     * @param  array<string, mixed>  $value
     */
    protected function processMessagesField(array $value, WebhookLog $webhookLog): void
    {
        $phoneNumberId = (string) ($value['metadata']['phone_number_id'] ?? '');

        /** @var WhatsAppAccount|null $account */
        $account = WhatsAppAccount::where('phone_number_id', $phoneNumberId)->first();

        if (! $account) {
            $webhookLog->update(['error' => 'Unknown phone_number_id']);

            return;
        }

        // 1. Process Inbound Messages
        if (! empty($value['messages'])) {
            $contactsMap = [];
            foreach ($value['contacts'] ?? [] as $c) {
                $waId = (string) ($c['wa_id'] ?? '');
                if ($waId !== '') {
                    $contactsMap[$waId] = $c;
                }
            }

            foreach ($value['messages'] as $msg) {
                $this->processInboundMessage($account, $msg, $contactsMap);
            }
        }

        // 2. Process Status Updates
        if (! empty($value['statuses'])) {
            foreach ($value['statuses'] as $st) {
                $this->processStatusUpdate($st);
            }
        }
    }

    /**
     * Process a single inbound message.
     *
     * @param  array<string, mixed>  $msg
     * @param  array<string, array<string, mixed>>  $contactsMap
     */
    protected function processInboundMessage(WhatsAppAccount $account, array $msg, array $contactsMap): void
    {
        $wamid = (string) ($msg['id'] ?? '');
        if ($wamid === '') {
            return;
        }

        // Idempotency: skip if message already ingested
        if (Message::where('wamid', $wamid)->exists()) {
            return;
        }

        $from = (string) ($msg['from'] ?? '');
        $waId = Contact::normalizeWaId($from);
        $profileName = $contactsMap[$from]['profile']['name'] ?? $contactsMap[$waId]['profile']['name'] ?? null;

        // Upsert Contact
        /** @var Contact $contact */
        $contact = Contact::where('workspace_id', $account->workspace_id)
            ->where('wa_id', $waId)
            ->first();

        if (! $contact) {
            $contact = Contact::create([
                'workspace_id' => $account->workspace_id,
                'wa_id' => $waId,
                'profile_name' => $profileName,
                'source' => 'inbound_wa',
                'opt_in_status' => OptInStatus::OPTED_IN,
                'opted_in_at' => now(),
            ]);
        } else {
            $updates = [];
            if ($profileName && empty($contact->profile_name)) {
                $updates['profile_name'] = $profileName;
            }
            if ($contact->opt_in_status === OptInStatus::UNKNOWN) {
                $updates['opt_in_status'] = OptInStatus::OPTED_IN;
                $updates['opted_in_at'] = now();
            }
            if (! empty($updates)) {
                $contact->update($updates);
            }
        }

        // Upsert Conversation
        /** @var Conversation $conversation */
        $conversation = Conversation::firstOrCreate(
            [
                'workspace_id' => $account->workspace_id,
                'whatsapp_account_id' => $account->id,
                'contact_id' => $contact->id,
            ],
            [
                'status' => ConversationStatus::OPEN,
                'unread_count' => 0,
            ]
        );

        // Parse Message Type, Body, and Media
        $rawType = (string) ($msg['type'] ?? 'text');
        $body = null;
        $mediaMetaId = null;
        $mediaMime = null;

        switch ($rawType) {
            case 'text':
                $messageType = MessageType::TEXT;
                $body = $msg['text']['body'] ?? null;
                break;
            case 'image':
                $messageType = MessageType::IMAGE;
                $mediaMetaId = $msg['image']['id'] ?? null;
                $mediaMime = $msg['image']['mime_type'] ?? null;
                $body = $msg['image']['caption'] ?? null;
                break;
            case 'video':
                $messageType = MessageType::VIDEO;
                $mediaMetaId = $msg['video']['id'] ?? null;
                $mediaMime = $msg['video']['mime_type'] ?? null;
                $body = $msg['video']['caption'] ?? null;
                break;
            case 'audio':
                $messageType = MessageType::AUDIO;
                $mediaMetaId = $msg['audio']['id'] ?? null;
                $mediaMime = $msg['audio']['mime_type'] ?? null;
                break;
            case 'document':
                $messageType = MessageType::DOCUMENT;
                $mediaMetaId = $msg['document']['id'] ?? null;
                $mediaMime = $msg['document']['mime_type'] ?? null;
                $body = $msg['document']['caption'] ?? $msg['document']['filename'] ?? null;
                break;
            case 'sticker':
                $messageType = MessageType::STICKER;
                $mediaMetaId = $msg['sticker']['id'] ?? null;
                $mediaMime = $msg['sticker']['mime_type'] ?? null;
                break;
            case 'location':
                $messageType = MessageType::LOCATION;
                $body = 'Location';
                break;
            case 'contacts':
                $messageType = MessageType::CONTACTS;
                $body = 'Contacts';
                break;
            case 'button':
                $messageType = MessageType::BUTTON;
                $body = $msg['button']['text'] ?? null;
                break;
            case 'interactive':
                $messageType = MessageType::INTERACTIVE;
                $interactive = $msg['interactive'] ?? [];
                $body = $interactive['button_reply']['title']
                    ?? $interactive['list_reply']['title']
                    ?? null;
                break;
            case 'reaction':
                $messageType = MessageType::REACTION;
                $body = $msg['reaction']['emoji'] ?? '';
                break;
            case 'order':
                $messageType = MessageType::ORDER;
                $body = 'Order';
                break;
            default:
                $messageType = MessageType::UNSUPPORTED;
                $body = '[Unsupported message type]';
                break;
        }

        $contextWamid = $msg['context']['id'] ?? null;

        // Create Message
        $message = Message::create([
            'workspace_id' => $account->workspace_id,
            'conversation_id' => $conversation->id,
            'whatsapp_account_id' => $account->id,
            'wamid' => $wamid,
            'direction' => MessageDirection::INBOUND,
            'sender_type' => MessageSenderType::CONTACT,
            'type' => $messageType,
            'body' => $body,
            'media_meta_id' => $mediaMetaId,
            'media_mime_type' => $mediaMime,
            'payload' => $msg,
            'context_wamid' => $contextWamid,
            'status' => MessageStatus::DELIVERED,
            'status_rank' => MessageStatus::DELIVERED->rank(),
            'delivered_at' => now(),
        ]);

        // Preview text for conversation
        $preview = match ($messageType) {
            MessageType::TEXT => Str::limit($body ?? '', 250),
            MessageType::IMAGE => '[Image]',
            MessageType::VIDEO => '[Video]',
            MessageType::AUDIO => '[Audio]',
            MessageType::DOCUMENT => '[Document]',
            MessageType::STICKER => '[Sticker]',
            MessageType::LOCATION => '[Location]',
            MessageType::CONTACTS => '[Contacts]',
            MessageType::BUTTON => Str::limit($body ?? '[Button]', 250),
            MessageType::INTERACTIVE => Str::limit($body ?? '[Interactive]', 250),
            MessageType::REACTION => "Reacted {$body}",
            default => '[Message]',
        };

        $convUpdates = [
            'last_message_id' => $message->id,
            'last_message_preview' => $preview,
            'last_message_at' => now(),
            'last_inbound_at' => now(),
            'window_expires_at' => now()->addHours(24),
            'unread_count' => $conversation->unread_count + 1,
        ];

        // Click-to-WhatsApp (CTWA) 7-day free conversation window
        if (! empty($msg['referral'])) {
            $convUpdates['free_entry_expires_at'] = now()->addDays(7);
        }

        // Reopen resolved or expired conversations on new inbound customer message
        if (in_array($conversation->status, [ConversationStatus::RESOLVED, ConversationStatus::EXPIRED], true)) {
            $convUpdates['status'] = ConversationStatus::OPEN;
        }

        $conversation->update($convUpdates);

        // Queue media download if media_meta_id is present
        if ($mediaMetaId) {
            DownloadWhatsAppMediaJob::dispatch($message->id)->onQueue('webhooks');
        }
    }

    /**
     * Process an outbound message delivery/read/failed status update.
     *
     * @param  array<string, mixed>  $st
     */
    protected function processStatusUpdate(array $st): void
    {
        $wamid = (string) ($st['id'] ?? '');
        if ($wamid === '') {
            return;
        }

        /** @var Message|null $message */
        $message = Message::where('wamid', $wamid)->first();
        if (! $message) {
            return;
        }

        $incomingRawStatus = (string) ($st['status'] ?? '');
        $incomingStatus = MessageStatus::tryFrom($incomingRawStatus);
        if (! $incomingStatus) {
            return;
        }

        // Out-of-order status guard:
        // Never overwrite READ with FAILED, DELIVERED, or SENT.
        if ($message->status === MessageStatus::READ) {
            return;
        }

        if ($incomingStatus === MessageStatus::FAILED) {
            if ($message->status === MessageStatus::DELIVERED) {
                return;
            }
        } elseif ($incomingStatus->rank() <= $message->status_rank) {
            return;
        }

        $updates = [
            'status' => $incomingStatus,
            'status_rank' => $incomingStatus->rank(),
        ];

        // Update timestamps
        $timestamp = isset($st['timestamp']) ? (int) $st['timestamp'] : time();
        $date = now()->setTimestamp($timestamp);

        if ($incomingStatus === MessageStatus::SENT && ! $message->sent_at) {
            $updates['sent_at'] = $date;
        } elseif ($incomingStatus === MessageStatus::DELIVERED && ! $message->delivered_at) {
            $updates['delivered_at'] = $date;
        } elseif ($incomingStatus === MessageStatus::READ && ! $message->read_at) {
            $updates['read_at'] = $date;
        } elseif ($incomingStatus === MessageStatus::FAILED && ! $message->failed_at) {
            $updates['failed_at'] = $date;
        }

        // Capture pricing and billing metadata
        if (isset($st['pricing']['category'])) {
            $updates['pricing_category'] = $st['pricing']['category'];
        }
        if (isset($st['pricing']['billable'])) {
            $updates['is_billable'] = (bool) $st['pricing']['billable'];
        }

        // Capture error metadata
        if (! empty($st['errors'][0])) {
            $updates['error_code'] = (string) ($st['errors'][0]['code'] ?? '');
            $updates['error_message'] = (string) ($st['errors'][0]['title'] ?? $st['errors'][0]['message'] ?? '');
        }

        $message->update($updates);

        // Advance CampaignRecipient and Campaign counters if linked
        $recipient = CampaignRecipient::where('message_id', $message->id)
            ->orWhere('wamid', $wamid)
            ->first();

        if ($recipient) {
            $this->advanceCampaignRecipient($recipient, $incomingStatus, $date);
        }
    }

    /**
     * Advance campaign recipient status and atomically increment parent campaign counters.
     */
    protected function advanceCampaignRecipient(
        CampaignRecipient $recipient,
        MessageStatus $incomingStatus,
        Carbon $date,
    ): void {
        $campaign = $recipient->campaign;

        if ($incomingStatus === MessageStatus::DELIVERED && $recipient->status !== RecipientStatus::DELIVERED && $recipient->status !== RecipientStatus::READ) {
            $recipient->update([
                'status' => RecipientStatus::DELIVERED,
                'delivered_at' => $date,
            ]);
            $campaign?->increment('delivered_count');
        } elseif ($incomingStatus === MessageStatus::READ && $recipient->status !== RecipientStatus::READ) {
            $recipient->update([
                'status' => RecipientStatus::READ,
                'read_at' => $date,
            ]);
            $campaign?->increment('read_count');
        } elseif ($incomingStatus === MessageStatus::FAILED && $recipient->status !== RecipientStatus::FAILED && $recipient->status !== RecipientStatus::DELIVERED && $recipient->status !== RecipientStatus::READ) {
            $recipient->update([
                'status' => RecipientStatus::FAILED,
            ]);
            $campaign?->increment('failed_count');
        }
    }

    /**
     * Process message template status updates (APPROVED, REJECTED, PAUSED, etc.).
     *
     * @param  array<string, mixed>  $value
     */
    protected function processTemplateStatusUpdate(array $value, string $wabaId): void
    {
        $metaTemplateId = (string) ($value['message_template_id'] ?? '');
        $templateName = (string) ($value['message_template_name'] ?? '');
        $language = (string) ($value['message_template_language'] ?? '');
        $event = strtoupper((string) ($value['event'] ?? ''));
        $reason = $value['reason'] ?? null;

        $template = Template::where('meta_template_id', $metaTemplateId)
            ->orWhere(function ($query) use ($templateName, $language) {
                if ($templateName !== '' && $language !== '') {
                    $query->where('name', $templateName)->where('language', $language);
                }
            })
            ->first();

        if (! $template) {
            return;
        }

        $newStatus = TemplateStatus::tryFrom($event);
        if ($newStatus) {
            $template->update([
                'status' => $newStatus,
                'rejected_reason' => $reason,
                'last_synced_at' => now(),
            ]);
        }
    }

    /**
     * Process message template category updates (MARKETING, UTILITY, AUTHENTICATION).
     *
     * @param  array<string, mixed>  $value
     */
    protected function processTemplateCategoryUpdate(array $value, string $wabaId): void
    {
        $metaTemplateId = (string) ($value['message_template_id'] ?? '');
        $templateName = (string) ($value['message_template_name'] ?? '');
        $language = (string) ($value['message_template_language'] ?? '');
        $newCategoryStr = strtoupper((string) ($value['new_category'] ?? ''));
        $prevCategoryStr = strtoupper((string) ($value['previous_category'] ?? ''));

        $template = Template::where('meta_template_id', $metaTemplateId)
            ->orWhere(function ($query) use ($templateName, $language) {
                if ($templateName !== '' && $language !== '') {
                    $query->where('name', $templateName)->where('language', $language);
                }
            })
            ->first();

        if (! $template) {
            return;
        }

        $newCategory = TemplateCategory::tryFrom($newCategoryStr);
        $prevCategory = TemplateCategory::tryFrom($prevCategoryStr);

        if ($newCategory) {
            $template->update([
                'category' => $newCategory,
                'previous_category' => $prevCategory?->value ?? $prevCategoryStr,
                'last_synced_at' => now(),
            ]);
        }
    }
}
