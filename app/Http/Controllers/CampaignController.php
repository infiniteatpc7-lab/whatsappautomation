<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\CampaignStatus;
use App\Enums\MessageDirection;
use App\Enums\OptInStatus;
use App\Enums\RecipientStatus;
use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Jobs\DispatchCampaignJob;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Tag;
use App\Models\Template;
use App\Models\WhatsAppAccount;
use App\Support\WorkspaceContext;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CampaignController extends Controller
{
    /**
     * Display all broadcast campaigns for the active workspace.
     */
    public function index(WorkspaceContext $workspaceContext): Response
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            abort(403, 'No active workspace.');
        }

        /** @var WhatsAppAccount|null $account */
        $account = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        $campaigns = Campaign::forWorkspace($workspace)
            ->with(['template:id,name,language,category', 'creator:id,name'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Campaign $c) => $this->formatCampaign($c))
            ->values();

        return Inertia::render('Dashboard/Broadcasts/Index', [
            'initialCampaigns' => $campaigns,
            'hasConnectedAccount' => $account !== null,
            'quota' => $this->buildQuota($account),
        ]);
    }

    /**
     * Show the create broadcast campaign builder.
     */
    public function create(WorkspaceContext $workspaceContext): Response
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            abort(403, 'No active workspace.');
        }

        /** @var WhatsAppAccount|null $account */
        $account = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        $approvedTemplates = Template::forWorkspace($workspace)
            ->where('status', TemplateStatus::APPROVED)
            ->orderBy('name')
            ->get()
            ->map(fn (Template $t) => [
                'id' => (string) $t->id,
                'name' => $t->name,
                'language' => $t->language,
                'category' => $t->category instanceof TemplateCategory ? $t->category->value : (string) $t->category,
                'header_type' => $t->header_type,
                'body_text' => $t->body_text,
                'components' => $t->components ?? [],
            ])
            ->values();

        $tags = Tag::forWorkspace($workspace)
            ->withCount([
                'contacts as opted_in_count' => fn ($q) => $q->where('opt_in_status', '!=', OptInStatus::OPTED_OUT->value),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Tag $t) => [
                'id' => (string) $t->id,
                'name' => $t->name,
                'opted_in_count' => (int) ($t->opted_in_count ?? 0),
            ])
            ->values();

        $contacts = Contact::forWorkspace($workspace)
            ->with('tags:id')
            ->where('opt_in_status', '!=', OptInStatus::OPTED_OUT->value)
            ->orderBy('name')
            ->get(['id', 'wa_id', 'name', 'profile_name', 'company_name'])
            ->map(fn (Contact $c) => [
                'id' => (string) $c->id,
                'wa_id' => $c->wa_id,
                'name' => $c->name ?: ($c->profile_name ?: "+{$c->wa_id}"),
                'company_name' => $c->company_name,
                'tag_ids' => $c->tags->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
            ])
            ->values();

        return Inertia::render('Dashboard/Broadcasts/Create', [
            'hasConnectedAccount' => $account !== null,
            'activeAccount' => $account ? [
                'id' => $account->id,
                'display_phone_number' => $account->display_phone_number,
                'verified_name' => $account->verified_name,
            ] : null,
            'approvedTemplates' => $approvedTemplates,
            'tags' => $tags,
            'contacts' => $contacts,
            'quota' => $this->buildQuota($account),
        ]);
    }

    /**
     * Store and optionally launch/schedule a broadcast campaign.
     */
    public function store(Request $request, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            return response()->json(['message' => 'No active workspace.'], 403);
        }

        /** @var WhatsAppAccount|null $account */
        $account = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        if (! $account) {
            return response()->json([
                'message' => 'No active WhatsApp account connected. Connect your Meta credentials in Workspace settings first.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'template_id' => ['required', 'integer'],
            'audience_type' => ['required', 'string', 'in:all_opted_in,tags,manual,csv'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer'],
            'contact_ids' => ['nullable', 'array'],
            'contact_ids.*' => ['integer'],
            'csv_rows' => ['nullable', 'array', 'max:2000'],
            'csv_rows.*.phone' => ['required_with:csv_rows', 'string', 'max:30'],
            'csv_rows.*.name' => ['nullable', 'string', 'max:120'],
            'csv_rows.*.email' => ['nullable', 'string', 'max:160'],
            'csv_rows.*.company_name' => ['nullable', 'string', 'max:120'],
            'csv_rows.*.city' => ['nullable', 'string', 'max:80'],
            'csv_rows.*.state' => ['nullable', 'string', 'max:80'],
            'csv_rows.*.custom_fields' => ['nullable', 'array'],
            'variable_mapping' => ['nullable', 'array'],
            'header_media_url' => ['nullable', 'url', 'max:2000'],
            'smart_sender_enabled' => ['nullable', 'boolean'],
            'retry_window_hours' => ['nullable', 'integer', 'min:1', 'max:72'],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        $template = Template::forWorkspace($workspace)
            ->where('id', $validated['template_id'])
            ->first();

        if (! $template) {
            return response()->json(['message' => 'Selected template not found.'], 404);
        }

        if ($template->status !== TemplateStatus::APPROVED) {
            return response()->json([
                'message' => 'Only APPROVED Meta templates can be used for broadcasts.',
            ], 422);
        }

        $audienceType = $validated['audience_type'];
        if ($audienceType === 'csv') {
            $csvRows = $validated['csv_rows'] ?? [];
            if ($csvRows === []) {
                return response()->json(['message' => 'Please upload a CSV file with at least one valid contact.'], 422);
            }

            $csvContactIds = [];
            foreach ($csvRows as $row) {
                $digits = ltrim(Contact::normalizeWaId((string) ($row['phone'] ?? '')), '0');
                if (strlen($digits) === 10) {
                    $digits = '91' . $digits;
                }
                if (strlen($digits) < 8 || strlen($digits) > 15) {
                    continue;
                }

                $existing = Contact::withTrashed()
                    ->where('workspace_id', $workspace->id)
                    ->where('wa_id', $digits)
                    ->first();

                $contactName = trim((string) ($row['name'] ?? '')) ?: null;
                $email = filter_var(trim((string) ($row['email'] ?? '')), FILTER_VALIDATE_EMAIL) ?: null;
                $company = trim((string) ($row['company_name'] ?? '')) ?: null;
                $city = trim((string) ($row['city'] ?? '')) ?: null;
                $state = trim((string) ($row['state'] ?? '')) ?: null;
                $rowCustomFields = is_array($row['custom_fields'] ?? null)
                    ? array_map(static fn ($v): string => trim((string) $v), $row['custom_fields'])
                    : [];

                if ($existing) {
                    if ($existing->trashed()) {
                        $existing->restore();
                    }
                    $mergedCustomFields = array_merge($existing->custom_fields ?? [], $rowCustomFields);
                    $existing->update([
                        'name' => $contactName ?? $existing->name,
                        'email' => $email ?? $existing->email,
                        'company_name' => $company ?? $existing->company_name,
                        'city' => $city ?? $existing->city,
                        'state' => $state ?? $existing->state,
                        'custom_fields' => $mergedCustomFields !== [] ? $mergedCustomFields : $existing->custom_fields,
                    ]);
                    if ($existing->opt_in_status !== OptInStatus::OPTED_OUT) {
                        $csvContactIds[] = $existing->id;
                    }
                } else {
                    $created = Contact::create([
                        'workspace_id' => $workspace->id,
                        'wa_id' => $digits,
                        'name' => $contactName,
                        'email' => $email,
                        'company_name' => $company,
                        'city' => $city,
                        'state' => $state,
                        'custom_fields' => $rowCustomFields !== [] ? $rowCustomFields : null,
                        'source' => 'broadcast_csv',
                        'opt_in_status' => OptInStatus::OPTED_IN,
                        'opt_in_source' => 'broadcast_csv',
                        'opted_in_at' => now(),
                    ]);
                    $csvContactIds[] = $created->id;
                }
            }

            $recipientIds = array_values(array_unique($csvContactIds));
        } else {
            // Resolve eligible recipients (never send to opted_out contacts)
            $contactQuery = Contact::forWorkspace($workspace)
                ->where('opt_in_status', '!=', OptInStatus::OPTED_OUT->value);

            if ($audienceType === 'tags') {
                $tagIds = $validated['tag_ids'] ?? [];
                if ($tagIds === []) {
                    return response()->json(['message' => 'Please select at least one tag.'], 422);
                }
                $contactQuery->whereHas('tags', fn ($q) => $q->whereIn('tags.id', $tagIds));
            } elseif ($audienceType === 'manual') {
                $contactIds = $validated['contact_ids'] ?? [];
                if ($contactIds === []) {
                    return response()->json(['message' => 'Please select at least one contact.'], 422);
                }
                $contactQuery->whereIn('id', $contactIds);
            }

            $recipientIds = $contactQuery->pluck('id')->all();
        }
        if ($recipientIds === []) {
            return response()->json([
                'message' => 'No eligible (non-opted-out) contacts matched your audience selection.',
            ], 422);
        }

        $quota = $this->buildQuota($account);
        $scheduledAt = ! empty($validated['scheduled_at']) ? Carbon::parse($validated['scheduled_at']) : null;
        $isScheduledFuture = $scheduledAt !== null && $scheduledAt->isFuture();

        if (! $isScheduledFuture && $quota['remaining'] !== null && count($recipientIds) > $quota['remaining']) {
            return response()->json([
                'message' => "Audience size (" . count($recipientIds) . ") exceeds your remaining 24h Meta quota ({$quota['remaining']} of {$quota['daily_limit']} contacts left).",
            ], 422);
        }

        $campaign = DB::transaction(function () use (
            $workspace,
            $account,
            $template,
            $request,
            $validated,
            $recipientIds,
            $isScheduledFuture,
            $scheduledAt,
            $audienceType
        ): Campaign {
            $campaign = Campaign::create([
                'workspace_id' => $workspace->id,
                'whatsapp_account_id' => $account->id,
                'template_id' => $template->id,
                'created_by' => $request->user()?->id,
                'name' => trim($validated['name']),
                'status' => $isScheduledFuture ? CampaignStatus::SCHEDULED : CampaignStatus::PROCESSING,
                'variable_mapping' => $validated['variable_mapping'] ?? [],
                'header_media_url' => $validated['header_media_url'] ?? null,
                'audience_filter' => [
                    'type' => $audienceType,
                    'tag_ids' => $validated['tag_ids'] ?? [],
                ],
                'smart_sender_enabled' => (bool) ($validated['smart_sender_enabled'] ?? false),
                'retry_window_hours' => (int) ($validated['retry_window_hours'] ?? 36),
                'scheduled_at' => $isScheduledFuture ? $scheduledAt : null,
                'started_at' => $isScheduledFuture ? null : now(),
                'total_recipients' => count($recipientIds),
            ]);

            $now = now();
            $rows = array_map(fn (int $contactId): array => [
                'campaign_id' => $campaign->id,
                'contact_id' => $contactId,
                'status' => RecipientStatus::PENDING->value,
                'created_at' => $now,
                'updated_at' => $now,
            ], $recipientIds);

            foreach (array_chunk($rows, 500) as $chunk) {
                CampaignRecipient::insert($chunk);
            }

            return $campaign;
        });

        if ($isScheduledFuture && $scheduledAt) {
            DispatchCampaignJob::dispatch($campaign->id)->delay($scheduledAt);
        } else {
            DispatchCampaignJob::dispatch($campaign->id);
        }

        $campaign->load(['template:id,name,language,category', 'creator:id,name']);

        return response()->json([
            'success' => true,
            'message' => $isScheduledFuture
                ? "Broadcast '{$campaign->name}' scheduled for {$scheduledAt?->toDayDateTimeString()}."
                : "Broadcast '{$campaign->name}' queued for " . count($recipientIds) . ' contacts.',
            'campaign' => $this->formatCampaign($campaign),
        ], 201);
    }

    /**
     * Show detailed delivery funnel and recipient logs for a campaign.
     */
    public function show(Campaign $campaign, WorkspaceContext $workspaceContext): Response
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace || (int) $campaign->workspace_id !== (int) $workspace->id) {
            abort(404);
        }

        $campaign->load(['template:id,name,language,category,header_type,body_text,components', 'creator:id,name']);

        $recipients = $campaign->recipients()
            ->with('contact:id,wa_id,name,profile_name,company_name')
            ->orderByDesc('id')
            ->limit(250)
            ->get()
            ->map(fn (CampaignRecipient $r) => [
                'id' => (string) $r->id,
                'contact_name' => $r->contact?->name ?: ($r->contact?->profile_name ?: "+{$r->contact?->wa_id}"),
                'wa_id' => $r->contact?->wa_id ?? '',
                'company_name' => $r->contact?->company_name,
                'status' => $r->status instanceof RecipientStatus ? $r->status->value : (string) $r->status,
                'error_code' => $r->error_code,
                'error_message' => $r->error_message,
                'sent_at' => $r->sent_at?->toISOString(),
                'delivered_at' => $r->delivered_at?->toISOString(),
                'read_at' => $r->read_at?->toISOString(),
            ])
            ->values();

        return Inertia::render('Dashboard/Broadcasts/Show', [
            'campaign' => $this->formatCampaign($campaign),
            'template' => [
                'name' => $campaign->template?->name ?? 'Template',
                'body_text' => $campaign->template?->body_text ?? '',
                'components' => $campaign->template?->components ?? [],
            ],
            'recipients' => $recipients,
        ]);
    }

    /**
     * Pause a currently processing broadcast campaign.
     */
    public function pause(Campaign $campaign, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace || (int) $campaign->workspace_id !== (int) $workspace->id) {
            return response()->json(['message' => 'Campaign not found.'], 404);
        }

        if ($campaign->status !== CampaignStatus::PROCESSING) {
            return response()->json(['message' => 'Only processing campaigns can be paused.'], 422);
        }

        $campaign->update(['status' => CampaignStatus::PAUSED]);
        $campaign->load(['template:id,name,language,category', 'creator:id,name']);

        return response()->json([
            'success' => true,
            'message' => 'Campaign paused.',
            'campaign' => $this->formatCampaign($campaign),
        ]);
    }

    /**
     * Resume a paused broadcast campaign.
     */
    public function resume(Campaign $campaign, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace || (int) $campaign->workspace_id !== (int) $workspace->id) {
            return response()->json(['message' => 'Campaign not found.'], 404);
        }

        if ($campaign->status !== CampaignStatus::PAUSED) {
            return response()->json(['message' => 'Only paused campaigns can be resumed.'], 422);
        }

        $campaign->update(['status' => CampaignStatus::PROCESSING]);
        DispatchCampaignJob::dispatch($campaign->id);
        $campaign->load(['template:id,name,language,category', 'creator:id,name']);

        return response()->json([
            'success' => true,
            'message' => 'Campaign resumed.',
            'campaign' => $this->formatCampaign($campaign),
        ]);
    }

    /**
     * Cancel a scheduled, processing, or paused broadcast campaign.
     */
    public function cancel(Campaign $campaign, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace || (int) $campaign->workspace_id !== (int) $workspace->id) {
            return response()->json(['message' => 'Campaign not found.'], 404);
        }

        if (! in_array($campaign->status, [CampaignStatus::SCHEDULED, CampaignStatus::PROCESSING, CampaignStatus::PAUSED], true)) {
            return response()->json(['message' => 'This campaign cannot be cancelled.'], 422);
        }

        $campaign->update(['status' => CampaignStatus::CANCELLED]);
        CampaignRecipient::query()
            ->where('campaign_id', $campaign->id)
            ->whereIn('status', [RecipientStatus::PENDING, RecipientStatus::QUEUED])
            ->update(['status' => RecipientStatus::SKIPPED->value]);

        $campaign->load(['template:id,name,language,category', 'creator:id,name']);

        return response()->json([
            'success' => true,
            'message' => 'Campaign cancelled.',
            'campaign' => $this->formatCampaign($campaign),
        ]);
    }

    /**
     * Re-queue all failed recipients of a campaign.
     */
    public function retryFailed(Campaign $campaign, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace || (int) $campaign->workspace_id !== (int) $workspace->id) {
            return response()->json(['message' => 'Campaign not found.'], 404);
        }

        $failedCount = CampaignRecipient::query()
            ->where('campaign_id', $campaign->id)
            ->where('status', RecipientStatus::FAILED)
            ->count();

        if ($failedCount === 0) {
            return response()->json(['message' => 'No failed recipients to retry.'], 422);
        }

        CampaignRecipient::query()
            ->where('campaign_id', $campaign->id)
            ->where('status', RecipientStatus::FAILED)
            ->update([
                'status' => RecipientStatus::PENDING->value,
                'error_code' => null,
                'error_message' => null,
                'next_retry_at' => null,
            ]);

        $campaign->update([
            'status' => CampaignStatus::PROCESSING,
            'failed_count' => 0,
            'completed_at' => null,
        ]);

        DispatchCampaignJob::dispatch($campaign->id);
        $campaign->load(['template:id,name,language,category', 'creator:id,name']);

        return response()->json([
            'success' => true,
            'message' => "Re-queued {$failedCount} failed recipients.",
            'campaign' => $this->formatCampaign($campaign),
        ]);
    }

    /**
     * @return array{tier: ?string, daily_limit: ?int, sent_today: int, remaining: ?int}
     */
    protected function buildQuota(?WhatsAppAccount $account): array
    {
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

        $remaining = $dailyLimit !== null ? max(0, $dailyLimit - $sentToday) : null;

        return [
            'tier' => $tier,
            'daily_limit' => $dailyLimit,
            'sent_today' => $sentToday,
            'remaining' => $remaining,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatCampaign(Campaign $c): array
    {
        return [
            'id' => (string) $c->id,
            'name' => $c->name,
            'status' => $c->status instanceof CampaignStatus ? $c->status->value : (string) $c->status,
            'template_name' => $c->template?->name ?? 'Unknown',
            'template_language' => $c->template?->language ?? 'en_US',
            'creator_name' => $c->creator?->name ?? 'System',
            'total_recipients' => $c->total_recipients,
            'sent_count' => $c->sent_count,
            'delivered_count' => $c->delivered_count,
            'read_count' => $c->read_count,
            'failed_count' => $c->failed_count,
            'replied_count' => $c->replied_count,
            'clicks_count' => $c->clicks_count ?? 0,
            'smart_sender_enabled' => (bool) $c->smart_sender_enabled,
            'retry_window_hours' => (int) ($c->retry_window_hours ?? 36),
            'scheduled_at' => $c->scheduled_at?->toISOString(),
            'started_at' => $c->started_at?->toISOString(),
            'completed_at' => $c->completed_at?->toISOString(),
            'created_at' => $c->created_at?->toISOString(),
        ];
    }
}
