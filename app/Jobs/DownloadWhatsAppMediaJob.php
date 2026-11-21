<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Message;
use App\Services\WhatsApp\MetaCloudClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DownloadWhatsAppMediaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [15, 60, 180];
    }

    public function __construct(public int $messageId) {}

    public function handle(MetaCloudClient $client): void
    {
        /** @var Message|null $message */
        $message = Message::with('whatsappAccount')->find($this->messageId);

        if (! $message || ! $message->whatsappAccount || ! $message->media_meta_id || ! empty($message->media_path)) {
            return;
        }

        $meta = $client->getMediaUrl($message->whatsappAccount, $message->media_meta_id);
        $url = $meta['url'] ?? null;
        $mime = $meta['mime_type'] ?? $message->media_mime_type ?? 'application/octet-stream';

        if (! $url) {
            return;
        }

        $binary = $client->downloadMedia($message->whatsappAccount, $url);

        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'video/mp4' => 'mp4',
            'video/3gpp' => '3gp',
            'audio/aac' => 'aac',
            'audio/mp4' => 'm4a',
            'audio/mpeg' => 'mp3',
            'audio/ogg' => 'ogg',
            'application/pdf' => 'pdf',
            'application/vnd.ms-excel' => 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
            'application/msword' => 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
            'text/plain' => 'txt',
        ];

        $ext = $extensions[$mime] ?? 'bin';
        $filename = Str::uuid()->toString().'.'.$ext;
        $path = "whatsapp-media/{$message->workspace_id}/{$filename}";

        Storage::disk('local')->put($path, $binary);

        $message->update([
            'media_path' => $path,
            'media_mime_type' => $mime,
        ]);
    }
}
