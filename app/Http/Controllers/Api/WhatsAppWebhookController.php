<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessWhatsAppWebhookJob;
use App\Models\WebhookLog;
use App\Models\WhatsAppAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class WhatsAppWebhookController extends Controller
{
    /**
     * Meta Webhook Verification (Challenge handshake).
     */
    public function verify(Request $request): Response
    {
        $mode = $request->input('hub_mode', $request->input('hub.mode'));
        $token = (string) $request->input('hub_verify_token', $request->input('hub.verify_token'));
        $challenge = (string) $request->input('hub_challenge', $request->input('hub.challenge'));

        if ($mode !== 'subscribe' || empty($token) || empty($challenge)) {
            abort(403, 'Invalid subscription verification parameters.');
        }

        $globalToken = (string) config('services.meta.webhook_verify_token', '');
        if ($globalToken !== '' && hash_equals($globalToken, $token)) {
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        // Check per-account verify tokens
        $matched = WhatsAppAccount::whereNotNull('webhook_verify_token')
            ->pluck('webhook_verify_token')
            ->contains(fn ($acctToken): bool => hash_equals((string) $acctToken, $token));

        if ($matched) {
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        abort(403, 'Invalid verification token.');
    }

    /**
     * Handle incoming Meta Webhook events.
     */
    public function handle(Request $request): JsonResponse
    {
        $payload = $request->all();
        $phoneNumberId = $request->input('entry.0.changes.0.value.metadata.phone_number_id');
        $field = $request->input('entry.0.changes.0.field');

        $eventType = match (true) {
            $request->has('entry.0.changes.0.value.messages') => 'message',
            $request->has('entry.0.changes.0.value.statuses') => 'status',
            $field === 'message_template_status_update' => 'template_update',
            $field === 'message_template_category_update' => 'template_update',
            $field === 'account_update' => 'account_update',
            default => 'unknown',
        };

        $workspaceId = null;
        if ($phoneNumberId) {
            $workspaceId = WhatsAppAccount::where('phone_number_id', (string) $phoneNumberId)->value('workspace_id');
        }

        $log = WebhookLog::create([
            'workspace_id' => $workspaceId,
            'phone_number_id' => $phoneNumberId ? (string) $phoneNumberId : null,
            'event_type' => $eventType,
            'payload' => $payload,
            'processed' => false,
            'created_at' => now(),
        ]);

        ProcessWhatsAppWebhookJob::dispatch($log->id)->onQueue('webhooks');

        return response()->json(['status' => 'received'], 200);
    }
}
