<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ConversationStatus;
use App\Enums\MessageDirection;
use App\Enums\MessageSenderType;
use App\Enums\MessageStatus;
use App\Enums\MessageType;
use App\Enums\OptInStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\WhatsAppAccount;
use App\Services\WhatsApp\MetaCloudClient;
use App\Support\WorkspaceContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    /**
     * Display the chat inbox.
     */
    public function index(Request $request, WorkspaceContext $workspaceContext): Response
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            abort(403, 'No active workspace found.');
        }

        /** @var WhatsAppAccount|null $activeAccount */
        $activeAccount = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        $conversations = Conversation::where('workspace_id', $workspace->id)
            ->with(['contact', 'lastMessage', 'whatsappAccount'])
            ->orderByDesc('last_message_at')
            ->get()
            ->map(fn (Conversation $c): array => $this->formatConversation($c));

        return Inertia::render('Dashboard/Chat/Index', [
            'initialConversations' => $conversations,
            'hasConnectedAccount' => $activeAccount !== null,
            'activePhoneNumber' => $activeAccount?->display_phone_number,
        ]);
    }

    /**
     * Get conversations list as JSON (for polling / background refresh).
     */
    public function conversations(Request $request, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            return response()->json([], 403);
        }

        $conversations = Conversation::where('workspace_id', $workspace->id)
            ->with(['contact', 'lastMessage', 'whatsappAccount'])
            ->orderByDesc('last_message_at')
            ->get()
            ->map(fn (Conversation $c): array => $this->formatConversation($c));

        return response()->json($conversations);
    }

    /**
     * Fetch message history for a conversation.
     */
    public function messages(Request $request, Conversation $conversation, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace || $conversation->workspace_id !== $workspace->id) {
            abort(403, 'Unauthorized access to conversation.');
        }

        $messages = $conversation->messages()
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn (Message $m): array => $this->formatMessage($m, $conversation));

        return response()->json([
            'conversation_id' => (string) $conversation->id,
            'is_window_open' => $conversation->isWindowOpen(),
            'window_expires_at' => $conversation->window_expires_at?->toISOString(),
            'messages' => $messages,
        ]);
    }

    /**
     * Send an outbound message to a WhatsApp customer.
     */
    public function storeMessage(
        Request $request,
        Conversation $conversation,
        WorkspaceContext $workspaceContext,
        MetaCloudClient $metaClient,
    ): JsonResponse {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace || $conversation->workspace_id !== $workspace->id) {
            abort(403, 'Unauthorized access to conversation.');
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:4096'],
        ]);

        /** @var WhatsAppAccount|null $account */
        $account = $conversation->whatsappAccount
            ?? $workspace->whatsappAccounts()->where('status', WhatsAppAccountStatus::CONNECTED)->first();

        if (! $account) {
            throw ValidationException::withMessages([
                'body' => 'No active WhatsApp account connected to this workspace.',
            ]);
        }

        // Meta 24-hour service window check
        if (! $conversation->isWindowOpen()) {
            throw ValidationException::withMessages([
                'body' => 'Customer service window is closed (more than 24 hours since last customer reply). Please use an approved WhatsApp Template to message this contact.',
            ]);
        }

        $body = trim($validated['body']);

        // Dispatch through Meta Cloud API
        try {
            $metaResponse = $metaClient->sendTextMessage(
                $account,
                $conversation->contact->wa_id,
                $body
            );
            $wamid = $metaResponse['messages'][0]['id'] ?? Str::uuid()->toString();
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'body' => 'WhatsApp delivery failed: '.$e->getMessage(),
            ]);
        }

        $message = Message::create([
            'workspace_id' => $workspace->id,
            'conversation_id' => $conversation->id,
            'whatsapp_account_id' => $account->id,
            'wamid' => $wamid,
            'direction' => MessageDirection::OUTBOUND,
            'sender_type' => MessageSenderType::AGENT,
            'sent_by_user_id' => $request->user()?->id,
            'type' => MessageType::TEXT,
            'body' => $body,
            'status' => MessageStatus::SENT,
            'status_rank' => MessageStatus::SENT->rank(),
            'sent_at' => now(),
        ]);

        $conversation->update([
            'last_message_id' => $message->id,
            'last_message_preview' => Str::limit($body, 250),
            'last_message_at' => now(),
        ]);

        return response()->json($this->formatMessage($message, $conversation), 201);
    }

    /**
     * Start a new conversation by phone number.
     */
    public function startConversation(
        Request $request,
        WorkspaceContext $workspaceContext,
        MetaCloudClient $metaClient,
    ): JsonResponse {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            abort(403, 'No active workspace found.');
        }

        $validated = $request->validate([
            'phone' => ['required', 'string', 'min:8', 'max:20'],
            'name' => ['nullable', 'string', 'max:100'],
            'message' => ['nullable', 'string', 'max:4096'],
        ]);

        /** @var WhatsAppAccount|null $account */
        $account = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        if (! $account) {
            throw ValidationException::withMessages([
                'phone' => 'No active WhatsApp account connected to this workspace.',
            ]);
        }

        $waId = Contact::normalizeWaId($validated['phone']);
        if (strlen($waId) < 8) {
            throw ValidationException::withMessages([
                'phone' => 'Invalid phone number format.',
            ]);
        }

        $contact = Contact::withTrashed()
            ->where('workspace_id', $workspace->id)
            ->where('wa_id', $waId)
            ->first();

        if (! $contact) {
            $contact = Contact::create([
                'workspace_id' => $workspace->id,
                'wa_id' => $waId,
                'profile_name' => $validated['name'] ?? null,
                'source' => 'outbound_chat',
                'opt_in_status' => OptInStatus::OPTED_IN,
                'opted_in_at' => now(),
            ]);
        } elseif ($contact->trashed()) {
            $contact->restore();
        }

        $conversation = Conversation::firstOrCreate(
            [
                'workspace_id' => $workspace->id,
                'whatsapp_account_id' => $account->id,
                'contact_id' => $contact->id,
            ],
            [
                'status' => ConversationStatus::OPEN,
                'unread_count' => 0,
                'window_expires_at' => now()->addHours(24),
            ]
        );

        $body = ! empty($validated['message']) ? trim((string) $validated['message']) : null;
        $messageRecord = null;

        if ($body) {
            // Dispatch outbound text
            try {
                $metaResponse = $metaClient->sendTextMessage($account, $contact->wa_id, $body);
                $wamid = $metaResponse['messages'][0]['id'] ?? Str::uuid()->toString();
            } catch (\Throwable $e) {
                throw ValidationException::withMessages([
                    'message' => 'WhatsApp delivery failed: '.$e->getMessage(),
                ]);
            }

            $messageRecord = Message::create([
                'workspace_id' => $workspace->id,
                'conversation_id' => $conversation->id,
                'whatsapp_account_id' => $account->id,
                'wamid' => $wamid,
                'direction' => MessageDirection::OUTBOUND,
                'sender_type' => MessageSenderType::AGENT,
                'sent_by_user_id' => $request->user()?->id,
                'type' => MessageType::TEXT,
                'body' => $body,
                'status' => MessageStatus::SENT,
                'status_rank' => MessageStatus::SENT->rank(),
                'sent_at' => now(),
            ]);

            $conversation->update([
                'last_message_id' => $messageRecord->id,
                'last_message_preview' => Str::limit($body, 250),
                'last_message_at' => now(),
                'status' => ConversationStatus::OPEN,
            ]);
        }

        return response()->json([
            'conversation' => $this->formatConversation($conversation->fresh()),
            'message' => $messageRecord ? $this->formatMessage($messageRecord, $conversation) : null,
        ], 201);
    }

    /**
     * Mark a conversation as read.
     */
    public function markAsRead(
        Request $request,
        Conversation $conversation,
        WorkspaceContext $workspaceContext,
        MetaCloudClient $metaClient,
    ): JsonResponse {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace || $conversation->workspace_id !== $workspace->id) {
            abort(403, 'Unauthorized access.');
        }

        $conversation->update(['unread_count' => 0]);

        // Attempt to mark latest inbound message as read on Meta
        /** @var Message|null $lastInbound */
        $lastInbound = $conversation->messages()
            ->where('direction', MessageDirection::INBOUND)
            ->whereNotNull('wamid')
            ->latest('id')
            ->first();

        if ($lastInbound && $conversation->whatsappAccount) {
            try {
                $metaClient->markAsRead($conversation->whatsappAccount, $lastInbound->wamid);
            } catch (\Throwable) {
                // Silently continue if Meta read receipt fails
            }
        }

        return response()->json(['success' => true]);
    }

    /**
     * Format a conversation model for the React frontend.
     *
     * @return array<string, mixed>
     */
    protected function formatConversation(Conversation $c): array
    {
        $contactName = $c->contact->profile_name ?: ($c->contact->name ?: "+{$c->contact->wa_id}");
        $initials = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $contactName) ?: 'WA', 0, 2));

        $avatar = $c->contact->custom_fields['avatar_url'] ?? null;

        $isOnline = $c->last_inbound_at !== null && $c->last_inbound_at->isAfter(now()->subMinutes(10));

        $lastFormatted = null;
        if ($c->lastMessage) {
            $lastFormatted = $this->formatMessage($c->lastMessage, $c);
        } elseif ($c->last_message_preview) {
            $lastFormatted = [
                'id' => 'preview-'.$c->id,
                'wamid' => null,
                'sender' => 'contact',
                'author' => $contactName,
                'text' => $c->last_message_preview,
                'type' => 'text',
                'status' => 'delivered',
                'timestamp' => $c->last_message_at ? $c->last_message_at->format('H:i') : now()->format('H:i'),
                'created_at' => $c->last_message_at?->toISOString() ?? $c->updated_at->toISOString(),
            ];
        }

        return [
            'id' => (string) $c->id,
            'uuid' => $c->uuid,
            'name' => $contactName,
            'phone' => "+{$c->contact->wa_id}",
            'avatar' => $avatar,
            'title' => $c->last_message_preview ?: "+{$c->contact->wa_id}",
            'status' => $isOnline ? 'online' : 'offline',
            'unread' => (int) $c->unread_count,
            'initials' => $initials,
            'is_window_open' => $c->isWindowOpen(),
            'window_expires_at' => $c->window_expires_at?->toISOString(),
            'last_message_at' => $c->last_message_at?->toISOString() ?? $c->updated_at->toISOString(),
            'last_message' => $lastFormatted,
            'messages' => $lastFormatted ? [$lastFormatted] : [],
            'quickReplies' => [
                'Thanks for reaching out! How can we help?',
                'Our team is reviewing your request.',
                'We have received your order details.',
            ],
            'autoReplies' => [],
        ];
    }

    /**
     * Format a message model for the React frontend.
     *
     * @return array<string, mixed>
     */
    protected function formatMessage(Message $m, Conversation $conversation): array
    {
        $isOutbound = $m->direction === MessageDirection::OUTBOUND;

        return [
            'id' => (string) $m->id,
            'wamid' => $m->wamid,
            'sender' => $isOutbound ? 'user' : 'contact',
            'author' => $isOutbound ? 'You' : ($conversation->contact->profile_name ?: 'Customer'),
            'text' => $m->body ?? '',
            'type' => $m->type instanceof MessageType ? $m->type->value : (string) $m->type,
            'status' => $m->status instanceof MessageStatus ? $m->status->value : (string) $m->status,
            'error_code' => $m->error_code,
            'error_message' => $m->error_message,
            'timestamp' => $m->created_at ? $m->created_at->format('H:i') : now()->format('H:i'),
            'created_at' => $m->created_at?->toISOString(),
        ];
    }
}
