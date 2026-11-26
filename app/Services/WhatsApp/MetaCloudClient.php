<?php

declare(strict_types=1);

namespace App\Services\WhatsApp;

use App\Exceptions\MetaApiException;
use App\Models\Contact;
use App\Models\WhatsAppAccount;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class MetaCloudClient
{
    protected string $baseUrl;

    protected string $version;

    protected int $timeout;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.meta.graph_base_url', 'https://graph.facebook.com'), '/');
        $this->version = (string) config('services.meta.graph_version', 'v22.0');
        $this->timeout = (int) config('services.meta.timeout', 15);
    }

    /**
     * Build an authenticated pending request to the Meta Graph API.
     */
    protected function request(?string $token = null): PendingRequest
    {
        $req = Http::baseUrl("{$this->baseUrl}/{$this->version}")
            ->timeout($this->timeout)
            ->acceptJson();

        if ($token) {
            $req->withToken($token);
        }

        return $req;
    }

    /**
     * Handle HTTP response, throwing MetaApiException on non-2xx status.
     *
     * @return array<string, mixed>
     *
     * @throws MetaApiException
     */
    protected function handleResponse(Response $response): array
    {
        if ($response->failed()) {
            throw MetaApiException::fromResponse($response);
        }

        return (array) $response->json();
    }

    /**
     * Verify and fetch phone number details from Meta.
     *
     * @return array<string, mixed>
     *
     * @throws MetaApiException
     */
    public function verifyPhoneNumber(string $phoneNumberId, string $accessToken): array
    {
        $response = $this->request($accessToken)->get("/{$phoneNumberId}", [
            'fields' => 'id,display_phone_number,verified_name,quality_rating,health_status,whatsapp_business_manager_messaging_limit,messaging_limit_tier',
        ]);

        return $this->handleResponse($response);
    }

    /**
     * Send an individual text message.
     *
     * @return array<string, mixed>
     *
     * @throws MetaApiException
     */
    public function sendTextMessage(
        WhatsAppAccount $account,
        string $toWaId,
        string $body,
        ?string $contextWamid = null,
    ): array {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => Contact::normalizeWaId($toWaId),
            'type' => 'text',
            'text' => [
                'preview_url' => true,
                'body' => $body,
            ],
        ];

        if ($contextWamid) {
            $payload['context'] = ['message_id' => $contextWamid];
        }

        $response = $this->request($account->access_token)
            ->post("/{$account->phone_number_id}/messages", $payload);

        return $this->handleResponse($response);
    }

    /**
     * Send a pre-approved template message.
     *
     * @param  array<int, array<string, mixed>>  $components
     * @return array<string, mixed>
     *
     * @throws MetaApiException
     */
    public function sendTemplateMessage(
        WhatsAppAccount $account,
        string $toWaId,
        string $templateName,
        string $languageCode,
        array $components = [],
    ): array {
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => Contact::normalizeWaId($toWaId),
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => ['code' => $languageCode],
                'components' => $components,
            ],
        ];

        $response = $this->request($account->access_token)
            ->post("/{$account->phone_number_id}/messages", $payload);

        return $this->handleResponse($response);
    }

    /**
     * Send an image, video, audio, or document message.
     *
     * @return array<string, mixed>
     *
     * @throws MetaApiException
     */
    public function sendMediaMessage(
        WhatsAppAccount $account,
        string $toWaId,
        string $type,
        string $mediaLinkOrId,
        ?string $caption = null,
        ?string $filename = null,
    ): array {
        $mediaObject = filter_var($mediaLinkOrId, FILTER_VALIDATE_URL)
            ? ['link' => $mediaLinkOrId]
            : ['id' => $mediaLinkOrId];

        if ($caption !== null && in_array($type, ['image', 'video', 'document'], true)) {
            $mediaObject['caption'] = $caption;
        }

        if ($filename !== null && $type === 'document') {
            $mediaObject['filename'] = $filename;
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => Contact::normalizeWaId($toWaId),
            'type' => $type,
            $type => $mediaObject,
        ];

        $response = $this->request($account->access_token)
            ->post("/{$account->phone_number_id}/messages", $payload);

        return $this->handleResponse($response);
    }

    /**
     * Fetch message templates registered under the WABA.
     *
     * @return array<string, mixed>
     *
     * @throws MetaApiException
     */
    public function fetchTemplates(WhatsAppAccount $account, int $limit = 100): array
    {
        $response = $this->request($account->access_token)
            ->get("/{$account->waba_id}/message_templates", [
                'limit' => $limit,
            ]);

        return $this->handleResponse($response);
    }

    /**
     * Create a new message template under the WABA.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws MetaApiException
     */
    public function createTemplate(WhatsAppAccount $account, array $payload): array
    {
        $response = $this->request($account->access_token)
            ->post("/{$account->waba_id}/message_templates", $payload);

        return $this->handleResponse($response);
    }

    /**
     * Edit an existing message template by its Meta template ID.
     * Meta replaces all components with the provided payload and re-evaluates the template.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws MetaApiException
     */
    public function updateTemplate(WhatsAppAccount $account, string $metaTemplateId, array $payload): array
    {
        $response = $this->request($account->access_token)
            ->post("/{$metaTemplateId}", $payload);

        return $this->handleResponse($response);
    }

    /**
     * Delete a message template from Meta WABA.
     *
     * @return array<string, mixed>
     *
     * @throws MetaApiException
     */
    public function deleteTemplate(WhatsAppAccount $account, string $name, ?string $metaTemplateId = null): array
    {
        $query = ['name' => $name];
        if ($metaTemplateId) {
            $query['hsm_id'] = $metaTemplateId;
        }

        $response = $this->request($account->access_token)
            ->delete("/{$account->waba_id}/message_templates", $query);

        return $this->handleResponse($response);
    }

    /**
     * Upload a sample media file via Meta's Resumable Upload API to obtain a header_handle
     * for creating IMAGE, VIDEO, DOCUMENT, or CAROUSEL templates.
     *
     * @throws MetaApiException
     */
    public function uploadMediaHandle(
        WhatsAppAccount $account,
        string $fileName,
        string $mimeType,
        string $binaryContent,
    ): string {
        $appId = (string) config('services.meta.app_id', '');
        if ($appId === '') {
            $appRes = $this->request($account->access_token)->get('/app', ['fields' => 'id']);
            $appData = $this->handleResponse($appRes);
            $appId = (string) ($appData['id'] ?? '');
        }

        if ($appId === '') {
            throw new MetaApiException('Unable to resolve Meta App ID. Set META_APP_ID in .env.');
        }

        $sessionRes = $this->request($account->access_token)->post("/{$appId}/uploads", [
            'file_name' => $fileName,
            'file_length' => strlen($binaryContent),
            'file_type' => $mimeType,
        ]);
        $sessionData = $this->handleResponse($sessionRes);
        $sessionId = (string) ($sessionData['id'] ?? '');

        if ($sessionId === '') {
            throw new MetaApiException('Meta Resumable Upload API did not return an upload session ID.');
        }

        $uploadRes = $this->request($account->access_token)
            ->withHeaders(['file_offset' => '0'])
            ->withBody($binaryContent, $mimeType)
            ->post("/{$sessionId}");

        $uploadData = $this->handleResponse($uploadRes);
        $handle = (string) ($uploadData['h'] ?? '');

        if ($handle === '') {
            throw new MetaApiException('Meta Resumable Upload API did not return a header_handle.');
        }

        return $handle;
    }

    /**
     * Get media download URL and metadata for a Meta media ID.
     *
     * @return array<string, mixed>
     *
     * @throws MetaApiException
     */
    public function getMediaUrl(WhatsAppAccount $account, string $mediaId): array
    {
        $response = $this->request($account->access_token)->get("/{$mediaId}");

        return $this->handleResponse($response);
    }

    /**
     * Download binary media content from Meta's authenticated URL.
     *
     * @throws MetaApiException
     */
    public function downloadMedia(WhatsAppAccount $account, string $mediaUrl): string
    {
        $response = Http::withToken($account->access_token)
            ->timeout($this->timeout * 2)
            ->get($mediaUrl);

        if ($response->failed()) {
            throw MetaApiException::fromResponse($response);
        }

        return $response->body();
    }

    /**
     * Mark an inbound message as read.
     *
     * @throws MetaApiException
     */
    public function markAsRead(WhatsAppAccount $account, string $wamid): bool
    {
        $response = $this->request($account->access_token)
            ->post("/{$account->phone_number_id}/messages", [
                'messaging_product' => 'whatsapp',
                'status' => 'read',
                'message_id' => $wamid,
            ]);

        $data = $this->handleResponse($response);

        return (bool) ($data['success'] ?? true);
    }
}
