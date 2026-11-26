<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\CampaignLink;
use Illuminate\Http\RedirectResponse;

class CampaignClickController extends Controller
{
    /**
     * Track a broadcast link click and redirect to the destination URL.
     */
    public function __invoke(string $token): RedirectResponse
    {
        $link = CampaignLink::query()
            ->with(['campaign', 'recipient'])
            ->where('token', $token)
            ->firstOrFail();

        $link->increment('clicks');
        $link->update(['last_clicked_at' => now()]);

        $recipient = $link->recipient;
        if ($recipient && $recipient->clicked_at === null) {
            $recipient->update(['clicked_at' => now()]);
            $link->campaign?->increment('clicks_count');
        } elseif (! $recipient) {
            $link->campaign?->increment('clicks_count');
        }

        return redirect()->away($link->target_url);
    }
}
