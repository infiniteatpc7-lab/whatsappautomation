<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\CampaignStatus;
use App\Enums\MessageDirection;
use App\Enums\MessageStatus;
use App\Enums\OptInStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Models\Campaign;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\WhatsAppAccount;
use App\Support\WorkspaceContext;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class OverviewController extends Controller
{
    public function __invoke(WorkspaceContext $workspaceContext): Response
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            abort(403, 'No active workspace.');
        }

        /** @var WhatsAppAccount|null $account */
        $account = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        $since30d = now()->subDays(30);

        $outbound30d = Message::forWorkspace($workspace)
            ->where('direction', MessageDirection::OUTBOUND)
            ->where('created_at', '>=', $since30d)
            ->count();

        $delivered30d = Message::forWorkspace($workspace)
            ->where('direction', MessageDirection::OUTBOUND)
            ->where('created_at', '>=', $since30d)
            ->whereIn('status', [MessageStatus::DELIVERED, MessageStatus::READ])
            ->count();

        $read30d = Message::forWorkspace($workspace)
            ->where('direction', MessageDirection::OUTBOUND)
            ->where('created_at', '>=', $since30d)
            ->where('status', MessageStatus::READ)
            ->count();

        $failed30d = Message::forWorkspace($workspace)
            ->where('direction', MessageDirection::OUTBOUND)
            ->where('created_at', '>=', $since30d)
            ->where('status', MessageStatus::FAILED)
            ->count();

        $deliveryRate = $outbound30d > 0 ? round(($delivered30d / $outbound30d) * 100, 1) : 0.0;

        $totalConversations = Conversation::forWorkspace($workspace)->count();
        $openWindows = Conversation::forWorkspace($workspace)
            ->where('window_expires_at', '>', now())
            ->count();

        $totalContacts = Contact::forWorkspace($workspace)->count();
        $optedInContacts = Contact::forWorkspace($workspace)
            ->where('opt_in_status', '!=', OptInStatus::OPTED_OUT->value)
            ->count();

        $tier = $account?->messaging_limit_tier;
        $dailyLimit = match ($tier) {
            'TIER_50' => 50,
            'TIER_250' => 250,
            'TIER_1K' => 1000,
            'TIER_2K' => 2000,
            'TIER_10K' => 10000,
            'TIER_100K' => 100000,
            default => null,
        };

        $sentToday = $account ? (int) Message::query()
            ->join('conversations', 'messages.conversation_id', '=', 'conversations.id')
            ->where('messages.whatsapp_account_id', $account->id)
            ->where('messages.direction', MessageDirection::OUTBOUND)
            ->where('messages.created_at', '>=', now()->subHours(24))
            ->distinct('conversations.contact_id')
            ->count('conversations.contact_id') : 0;

        // 7-day message volume for AreaGraph
        $dailyVolume = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = Carbon::today()->subDays($i);
            $dayStart = $day->copy()->startOfDay();
            $dayEnd = $day->copy()->endOfDay();

            $outCount = Message::forWorkspace($workspace)
                ->where('direction', MessageDirection::OUTBOUND)
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->count();

            $inCount = Message::forWorkspace($workspace)
                ->where('direction', MessageDirection::INBOUND)
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->count();

            $dailyVolume[] = [
                'month' => $day->format('M d'),
                'desktop' => $outCount,
                'mobile' => $inCount,
            ];
        }

        // Last 6 campaigns for BarGraph
        $recentCampaigns = Campaign::forWorkspace($workspace)
            ->with('template:id,name')
            ->orderByDesc('created_at')
            ->limit(6)
            ->get();

        $campaignBars = $recentCampaigns->reverse()->values()->map(fn (Campaign $c) => [
            'month' => mb_strimwidth($c->name, 0, 12, '…'),
            'desktop' => $c->delivered_count,
            'mobile' => $c->read_count,
        ])->all();

        $recentList = $recentCampaigns->take(5)->map(function (Campaign $c): array {
            $words = preg_split('/[\s_-]+/', $c->name) ?: ['C'];
            $initials = strtoupper(substr($words[0] ?? 'C', 0, 1) . substr($words[1] ?? '', 0, 1));

            return [
                'id' => (string) $c->id,
                'name' => $c->name,
                'subtitle' => ($c->template?->name ?? 'Template') . ' • ' . ucfirst($c->status instanceof CampaignStatus ? $c->status->value : (string) $c->status),
                'fallback' => $initials ?: 'WA',
                'metric' => "{$c->delivered_count}/{$c->total_recipients}",
            ];
        })->values()->all();

        $sentOnly30d = max(0, $outbound30d - $delivered30d - $failed30d);
        $deliveredNotRead30d = max(0, $delivered30d - $read30d);

        $statusPie = [
            ['browser' => 'delivered', 'visitors' => $deliveredNotRead30d, 'fill' => 'var(--color-delivered)'],
            ['browser' => 'read', 'visitors' => $read30d, 'fill' => 'var(--color-read)'],
            ['browser' => 'sent', 'visitors' => $sentOnly30d, 'fill' => 'var(--color-sent)'],
            ['browser' => 'failed', 'visitors' => $failed30d, 'fill' => 'var(--color-failed)'],
        ];

        return Inertia::render('Dashboard/Overview', [
            'stats' => [
                'outbound_30d' => $outbound30d,
                'delivered_30d' => $delivered30d,
                'read_30d' => $read30d,
                'delivery_rate' => $deliveryRate,
                'total_conversations' => $totalConversations,
                'open_windows' => $openWindows,
                'total_contacts' => $totalContacts,
                'opted_in_contacts' => $optedInContacts,
                'sent_today' => $sentToday,
                'daily_limit' => $dailyLimit,
                'tier' => $tier,
                'quality_rating' => $account?->quality_rating,
                'health_status' => $account?->health_status,
            ],
            'dailyVolume' => $dailyVolume,
            'campaignBars' => $campaignBars,
            'recentCampaigns' => $recentList,
            'statusPie' => $statusPie,
        ]);
    }
}
