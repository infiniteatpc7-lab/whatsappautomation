<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Exceptions\MetaApiException;
use App\Models\Template;
use App\Models\WhatsAppAccount;
use App\Services\WhatsApp\MetaCloudClient;
use App\Support\WorkspaceContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TemplateController extends Controller
{
    /**
     * Display the WhatsApp Templates list.
     */
    public function index(Request $request, WorkspaceContext $workspaceContext): Response
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            abort(403, 'No active workspace.');
        }

        /** @var WhatsAppAccount|null $activeAccount */
        $activeAccount = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        $templates = Template::where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get()
            ->map(fn (Template $t): array => $this->formatTemplate($t));

        return Inertia::render('Dashboard/Templates/Index', [
            'initialTemplates' => $templates,
            'hasConnectedAccount' => $activeAccount !== null,
            'activeAccount' => $activeAccount ? [
                'id' => $activeAccount->id,
                'waba_id' => $activeAccount->waba_id,
                'phone_number_id' => $activeAccount->phone_number_id,
                'display_phone_number' => $activeAccount->display_phone_number,
                'verified_name' => $activeAccount->verified_name,
            ] : null,
        ]);
    }

    /**
     * Show the full page template creation view.
     */
    public function create(Request $request, WorkspaceContext $workspaceContext): Response
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            abort(403, 'No active workspace.');
        }

        /** @var WhatsAppAccount|null $activeAccount */
        $activeAccount = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        return Inertia::render('Dashboard/Templates/Create', [
            'hasConnectedAccount' => $activeAccount !== null,
            'activeAccount' => $activeAccount ? [
                'id' => $activeAccount->id,
                'waba_id' => $activeAccount->waba_id,
                'phone_number_id' => $activeAccount->phone_number_id,
                'display_phone_number' => $activeAccount->display_phone_number,
                'verified_name' => $activeAccount->verified_name,
            ] : null,
        ]);
    }

    /**
     * Create and submit a new message template to Meta Cloud API.
     */
    public function store(
        Request $request,
        WorkspaceContext $workspaceContext,
        MetaCloudClient $metaClient,
    ): JsonResponse {
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
                'message' => 'No active WhatsApp account connected. Please connect your Meta Cloud API credentials in Workspace settings.',
            ], 422);
        }

        if (! $account->waba_id) {
            return response()->json([
                'message' => 'Connected WhatsApp account does not have a WABA ID configured.',
            ], 422);
        }

        $validated = $this->validateTemplatePayload($request, isCreate: true);

        $name = strtolower($validated['name']);
        $category = strtoupper($validated['category']);
        $language = $validated['language'];
        $templateType = strtoupper($validated['template_type'] ?? 'STANDARD');
        $headerType = $templateType === 'CAROUSEL'
            ? 'CAROUSEL'
            : strtoupper($validated['header_type'] ?? 'NONE');
        $bodyText = trim($validated['body_text']);
        $components = $this->buildComponentsPayload($validated);

        $metaPayload = [
            'name' => $name,
            'category' => $category,
            'language' => $language,
            'components' => $components,
        ];

        try {
            $metaResponse = $metaClient->createTemplate($account, $metaPayload);
            $metaTemplateId = (string) ($metaResponse['id'] ?? Str::uuid()->toString());
            $metaStatus = strtoupper((string) ($metaResponse['status'] ?? 'PENDING'));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Template creation rejected by Meta Cloud API', [
                'name' => $name,
                'category' => $category,
                'error' => $e->getMessage(),
                'raw' => $e instanceof \App\Exceptions\MetaApiException ? $e->rawResponse : null,
            ]);

            return response()->json([
                'message' => 'Failed to create template on Meta: ' . $e->getMessage(),
            ], 422);
        }

        $template = Template::updateOrCreate(
            [
                'workspace_id' => $workspace->id,
                'name' => $name,
                'language' => $language,
            ],
            [
                'whatsapp_account_id' => $account->id,
                'meta_template_id' => $metaTemplateId,
                'status' => TemplateStatus::tryFrom($metaStatus) ?? TemplateStatus::PENDING,
                'category' => TemplateCategory::tryFrom($category) ?? TemplateCategory::UTILITY,
                'header_type' => $headerType,
                'body_text' => $bodyText,
                'components' => $components,
                'last_synced_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => "Template '{$name}' created and submitted to Meta successfully.",
            'template' => $this->formatTemplate($template),
        ], 201);
    }

    /**
     * Synchronize templates from Meta Graph API.
     */
    public function sync(
        Request $request,
        WorkspaceContext $workspaceContext,
        MetaCloudClient $metaClient,
    ): JsonResponse|RedirectResponse {
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
                'message' => 'No active WhatsApp account connected. Please connect your Meta Cloud API credentials in Workspace settings.',
            ], 422);
        }

        if (! $account->waba_id) {
            return response()->json([
                'message' => 'Connected WhatsApp account does not have a WABA ID configured.',
            ], 422);
        }

        try {
            $response = $metaClient->fetchTemplates($account, 250);
            $rawTemplates = $response['data'] ?? [];
            $syncedCount = 0;

            foreach ($rawTemplates as $item) {
                $metaTemplateId = (string) ($item['id'] ?? '');
                $name = (string) ($item['name'] ?? '');
                $language = (string) ($item['language'] ?? 'en_US');
                $rawStatus = strtoupper((string) ($item['status'] ?? 'PENDING'));
                $rawCategory = strtoupper((string) ($item['category'] ?? 'UTILITY'));
                $components = $item['components'] ?? [];

                // Extract body text and header type
                $bodyText = '';
                $headerType = 'NONE';

                foreach ($components as $c) {
                    $type = strtoupper((string) ($c['type'] ?? ''));
                    if ($type === 'BODY') {
                        $bodyText = (string) ($c['text'] ?? '');
                    } elseif ($type === 'HEADER') {
                        $headerType = (string) ($c['format'] ?? 'TEXT');
                    }
                }

                $status = TemplateStatus::tryFrom($rawStatus) ?? TemplateStatus::PENDING;
                $category = TemplateCategory::tryFrom($rawCategory) ?? TemplateCategory::UTILITY;

                Template::updateOrCreate(
                    [
                        'workspace_id' => $workspace->id,
                        'name' => $name,
                        'language' => $language,
                    ],
                    [
                        'whatsapp_account_id' => $account->id,
                        'meta_template_id' => $metaTemplateId,
                        'category' => $category,
                        'status' => $status,
                        'rejected_reason' => $item['rejected_reason'] ?? null,
                        'header_type' => $headerType,
                        'body_text' => $bodyText,
                        'components' => $components,
                        'last_synced_at' => now(),
                    ]
                );

                $syncedCount++;
            }

            if ($request->wantsJson()) {
                $updatedTemplates = Template::where('workspace_id', $workspace->id)
                    ->orderBy('name')
                    ->get()
                    ->map(fn (Template $t): array => $this->formatTemplate($t));

                return response()->json([
                    'success' => true,
                    'synced_count' => $syncedCount,
                    'message' => "Successfully synced {$syncedCount} templates from Meta.",
                    'templates' => $updatedTemplates,
                ]);
            }

            return back()->with('success', "Successfully synced {$syncedCount} templates from Meta.");
        } catch (MetaApiException $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Meta API Error: '.$e->getMessage(),
                ], 422);
            }

            return back()->with('error', 'Meta API Error: '.$e->getMessage());
        } catch (\Throwable $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to sync templates: '.$e->getMessage(),
                ], 500);
            }

            return back()->with('error', 'Failed to sync templates: '.$e->getMessage());
        }
    }

    /**
     * Show the full page template edit view (enforcing Meta edit policy).
     */
    public function edit(Request $request, Template $template, WorkspaceContext $workspaceContext): Response
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            abort(403, 'No active workspace.');
        }

        if ((int) $template->workspace_id !== (int) $workspace->id) {
            abort(404);
        }

        /** @var WhatsAppAccount|null $activeAccount */
        $activeAccount = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        return Inertia::render('Dashboard/Templates/Create', [
            'hasConnectedAccount' => $activeAccount !== null,
            'activeAccount' => $activeAccount ? [
                'id' => $activeAccount->id,
                'waba_id' => $activeAccount->waba_id,
                'phone_number_id' => $activeAccount->phone_number_id,
                'display_phone_number' => $activeAccount->display_phone_number,
                'verified_name' => $activeAccount->verified_name,
            ] : null,
            'template' => $this->formatTemplate($template),
        ]);
    }

    /**
     * Update an existing message template on Meta Cloud API under Meta policy.
     */
    public function update(
        Request $request,
        Template $template,
        WorkspaceContext $workspaceContext,
        MetaCloudClient $metaClient,
    ): JsonResponse {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            return response()->json(['message' => 'No active workspace.'], 403);
        }

        if ((int) $template->workspace_id !== (int) $workspace->id) {
            return response()->json(['message' => 'Template not found.'], 404);
        }

        /** @var WhatsAppAccount|null $account */
        $account = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        if (! $account) {
            return response()->json([
                'message' => 'No active WhatsApp account connected. Please connect your Meta Cloud API credentials in Workspace settings.',
            ], 422);
        }

        if (! $template->meta_template_id) {
            return response()->json([
                'message' => 'This template does not have a Meta template ID and cannot be edited.',
            ], 422);
        }

        $currentStatus = $template->status instanceof TemplateStatus
            ? $template->status
            : TemplateStatus::tryFrom((string) $template->status);

        $editableStatuses = [
            TemplateStatus::APPROVED,
            TemplateStatus::REJECTED,
            TemplateStatus::PAUSED,
        ];

        if (! in_array($currentStatus, $editableStatuses, true)) {
            $statusLabel = $currentStatus?->value ?? 'UNKNOWN';

            return response()->json([
                'message' => "Templates with status '{$statusLabel}' cannot be edited under Meta policy. Only APPROVED, REJECTED, or PAUSED templates are editable.",
            ], 422);
        }

        $validated = $this->validateTemplatePayload($request, isCreate: false);

        $headerType = strtoupper($validated['header_type'] ?? 'NONE');
        $bodyText = trim($validated['body_text']);
        $components = $this->buildComponentsPayload($validated);

        $metaPayload = [
            'components' => $components,
        ];

        // Meta policy: category cannot be changed on an APPROVED template
        $newCategory = isset($validated['category']) ? strtoupper($validated['category']) : null;
        if ($currentStatus !== TemplateStatus::APPROVED && $newCategory) {
            $metaPayload['category'] = $newCategory;
        }

        try {
            $metaClient->updateTemplate($account, $template->meta_template_id, $metaPayload);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Template update rejected by Meta Cloud API', [
                'template_id' => $template->id,
                'meta_template_id' => $template->meta_template_id,
                'error' => $e->getMessage(),
                'raw' => $e instanceof \App\Exceptions\MetaApiException ? $e->rawResponse : null,
            ]);

            return response()->json([
                'message' => 'Failed to update template on Meta: ' . $e->getMessage(),
            ], 422);
        }

        $updateData = [
            'header_type' => $headerType,
            'body_text' => $bodyText,
            'components' => $components,
            'status' => TemplateStatus::PENDING,
            'rejected_reason' => null,
            'last_synced_at' => now(),
        ];

        if ($currentStatus !== TemplateStatus::APPROVED && $newCategory) {
            $updateData['category'] = TemplateCategory::tryFrom($newCategory) ?? $template->category;
        }

        $template->update($updateData);

        return response()->json([
            'success' => true,
            'message' => "Template '{$template->name}' updated and resubmitted to Meta for review.",
            'template' => $this->formatTemplate($template->fresh()),
        ]);
    }

    /**
     * Delete a message template from Meta Cloud API and soft-delete locally.
     */
    public function destroy(
        Template $template,
        WorkspaceContext $workspaceContext,
        MetaCloudClient $metaClient,
    ): JsonResponse {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace || (int) $template->workspace_id !== (int) $workspace->id) {
            return response()->json(['message' => 'Template not found.'], 404);
        }

        /** @var WhatsAppAccount|null $account */
        $account = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->first();

        if ($account && $account->waba_id && $template->meta_template_id) {
            try {
                $metaClient->deleteTemplate($account, $template->name, $template->meta_template_id);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Template deletion rejected by Meta Cloud API', [
                    'template_id' => $template->id,
                    'name' => $template->name,
                    'error' => $e->getMessage(),
                ]);

                return response()->json([
                    'message' => 'Failed to delete template on Meta: ' . $e->getMessage(),
                ], 422);
            }
        }

        $name = $template->name;
        $template->delete();

        return response()->json([
            'success' => true,
            'message' => "Template '{$name}' deleted successfully.",
        ]);
    }

    /**
     * Upload a sample image, video, or PDF to Meta Resumable Upload API to get a header_handle.
     */
    public function uploadSample(
        Request $request,
        WorkspaceContext $workspaceContext,
        MetaCloudClient $metaClient,
    ): JsonResponse {
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
                'message' => 'No active WhatsApp account connected.',
            ], 422);
        }

        $request->validate([
            'file' => ['required', 'file', 'max:16384', 'mimes:jpg,jpeg,png,mp4,pdf'],
        ]);

        $file = $request->file('file');
        $binary = file_get_contents($file->getRealPath());
        if ($binary === false) {
            return response()->json(['message' => 'Could not read uploaded file.'], 422);
        }

        try {
            $handle = $metaClient->uploadMediaHandle(
                $account,
                $file->getClientOriginalName(),
                $file->getMimeType() ?: 'application/octet-stream',
                $binary
            );
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Meta sample upload failed: ' . $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'header_handle' => $handle,
            'file_name' => $file->getClientOriginalName(),
        ]);
    }

    /**
     * Validate create or edit template request fields.
     *
     * @return array<string, mixed>
     */
    protected function validateTemplatePayload(Request $request, bool $isCreate): array
    {
        $rules = [
            'template_type' => ['nullable', 'string', 'in:STANDARD,CAROUSEL'],
            'header_type' => ['nullable', 'string', 'in:NONE,TEXT,IMAGE,VIDEO,DOCUMENT'],
            'header_text' => ['nullable', 'string', 'max:60'],
            'header_example' => ['nullable', 'string', 'max:60'],
            'header_handle' => ['nullable', 'string', 'max:1000'],
            'body_text' => ['required', 'string', 'max:1024'],
            'body_examples' => ['nullable', 'array'],
            'body_examples.*' => ['nullable', 'string', 'max:100'],
            'footer_text' => ['nullable', 'string', 'max:60'],
            'buttons' => ['nullable', 'array', 'max:10'],
            'buttons.*.type' => ['required', 'string', 'in:QUICK_REPLY,URL,PHONE_NUMBER'],
            'buttons.*.text' => ['required', 'string', 'max:25'],
            'buttons.*.url' => ['nullable', 'string', 'max:2000'],
            'buttons.*.url_example' => ['nullable', 'string', 'max:2000'],
            'buttons.*.phone_number' => ['nullable', 'string', 'max:20'],
            'carousel_cards' => ['nullable', 'array', 'min:2', 'max:10'],
            'carousel_cards.*.header_format' => ['required_with:carousel_cards', 'string', 'in:IMAGE,VIDEO'],
            'carousel_cards.*.header_handle' => ['required_with:carousel_cards', 'string', 'max:1000'],
            'carousel_cards.*.body_text' => ['required_with:carousel_cards', 'string', 'max:160'],
            'carousel_cards.*.buttons' => ['nullable', 'array', 'max:2'],
            'carousel_cards.*.buttons.*.type' => ['required', 'string', 'in:QUICK_REPLY,URL,PHONE_NUMBER'],
            'carousel_cards.*.buttons.*.text' => ['required', 'string', 'max:25'],
            'carousel_cards.*.buttons.*.url' => ['nullable', 'string', 'max:2000'],
            'carousel_cards.*.buttons.*.url_example' => ['nullable', 'string', 'max:2000'],
            'carousel_cards.*.buttons.*.phone_number' => ['nullable', 'string', 'max:20'],
        ];

        if ($isCreate) {
            $rules['name'] = ['required', 'string', 'max:512', 'regex:/^[a-z0-9_]+$/'];
            $rules['category'] = ['required', 'string', 'in:MARKETING,UTILITY,AUTHENTICATION'];
            $rules['language'] = ['required', 'string', 'max:10'];
        } else {
            $rules['category'] = ['nullable', 'string', 'in:MARKETING,UTILITY,AUTHENTICATION'];
        }

        return $request->validate($rules);
    }

    /**
     * Build the Meta Cloud API components payload from validated input.
     *
     * @param  array<string, mixed>  $validated
     * @return array<int, array<string, mixed>>
     */
    protected function buildComponentsPayload(array $validated): array
    {
        $templateType = strtoupper($validated['template_type'] ?? 'STANDARD');
        $headerType = strtoupper($validated['header_type'] ?? 'NONE');
        $headerText = trim($validated['header_text'] ?? '');
        $headerExample = trim($validated['header_example'] ?? '');
        $headerHandle = trim($validated['header_handle'] ?? '');
        $bodyText = trim($validated['body_text']);
        $bodyExamples = $validated['body_examples'] ?? [];
        $footerText = trim($validated['footer_text'] ?? '');
        $buttons = $validated['buttons'] ?? [];

        $formatButtons = static function (array $rawButtons): array {
            $formatted = [];
            foreach ($rawButtons as $btn) {
                $type = strtoupper($btn['type'] ?? 'QUICK_REPLY');
                $text = substr(trim($btn['text'] ?? ''), 0, 25);
                if ($text === '') {
                    continue;
                }

                if ($type === 'QUICK_REPLY') {
                    $formatted[] = [
                        'type' => 'QUICK_REPLY',
                        'text' => $text,
                    ];
                } elseif ($type === 'URL') {
                    $url = trim($btn['url'] ?? '');
                    if ($url !== '') {
                        $btnObj = [
                            'type' => 'URL',
                            'text' => $text,
                            'url' => $url,
                        ];
                        if (str_contains($url, '{{1}}')) {
                            $btnObj['example'] = [! empty($btn['url_example']) ? $btn['url_example'] : 'sample'];
                        }
                        $formatted[] = $btnObj;
                    }
                } elseif ($type === 'PHONE_NUMBER') {
                    $phone = trim($btn['phone_number'] ?? '');
                    if ($phone !== '') {
                        $formatted[] = [
                            'type' => 'PHONE_NUMBER',
                            'text' => $text,
                            'phone_number' => $phone,
                        ];
                    }
                }
            }

            return $formatted;
        };

        $components = [];

        if ($templateType === 'STANDARD') {
            if ($headerType === 'TEXT' && $headerText !== '') {
                $headerComp = [
                    'type' => 'HEADER',
                    'format' => 'TEXT',
                    'text' => $headerText,
                ];
                if (str_contains($headerText, '{{1}}')) {
                    $headerComp['example'] = [
                        'header_text' => [$headerExample !== '' ? $headerExample : 'Sample'],
                    ];
                }
                $components[] = $headerComp;
            } elseif (in_array($headerType, ['IMAGE', 'VIDEO', 'DOCUMENT'], true) && $headerHandle !== '') {
                $components[] = [
                    'type' => 'HEADER',
                    'format' => $headerType,
                    'example' => [
                        'header_handle' => [$headerHandle],
                    ],
                ];
            }
        }

        $bodyComp = [
            'type' => 'BODY',
            'text' => $bodyText,
        ];

        preg_match_all('/\{\{(\d+)\}\}/', $bodyText, $matches);
        if (! empty($matches[0])) {
            $sampleValues = [];
            foreach ($matches[1] as $idx => $varNum) {
                $sampleValues[] = ! empty($bodyExamples[$idx]) ? (string) $bodyExamples[$idx] : 'Sample ' . $varNum;
            }
            $bodyComp['example'] = [
                'body_text' => [$sampleValues],
            ];
        }
        $components[] = $bodyComp;

        if ($templateType === 'CAROUSEL' && ! empty($validated['carousel_cards'])) {
            $cards = [];
            foreach ($validated['carousel_cards'] as $card) {
                $cardFormat = strtoupper($card['header_format'] ?? 'IMAGE');
                $cardComponents = [
                    [
                        'type' => 'HEADER',
                        'format' => $cardFormat,
                        'example' => [
                            'header_handle' => [trim((string) $card['header_handle'])],
                        ],
                    ],
                    [
                        'type' => 'BODY',
                        'text' => trim((string) $card['body_text']),
                    ],
                ];

                $cardButtons = $formatButtons($card['buttons'] ?? []);
                if ($cardButtons !== []) {
                    $cardComponents[] = [
                        'type' => 'BUTTONS',
                        'buttons' => $cardButtons,
                    ];
                }

                $cards[] = ['components' => $cardComponents];
            }

            $components[] = [
                'type' => 'CAROUSEL',
                'cards' => $cards,
            ];

            return $components;
        }

        if ($footerText !== '') {
            $components[] = [
                'type' => 'FOOTER',
                'text' => $footerText,
            ];
        }

        if (! empty($buttons)) {
            $formattedButtons = $formatButtons($buttons);
            if ($formattedButtons !== []) {
                $components[] = [
                    'type' => 'BUTTONS',
                    'buttons' => $formattedButtons,
                ];
            }
        }

        return $components;
    }

    /**
     * Format a template model for the React frontend.
     *
     * @return array<string, mixed>
     */
    protected function formatTemplate(Template $t): array
    {
        return [
            'id' => (string) $t->id,
            'meta_template_id' => $t->meta_template_id,
            'name' => $t->name,
            'language' => $t->language,
            'category' => $t->category instanceof TemplateCategory ? $t->category->value : (string) $t->category,
            'status' => $t->status instanceof TemplateStatus ? $t->status->value : (string) $t->status,
            'header_type' => $t->header_type,
            'body_text' => $t->body_text,
            'components' => $t->components ?? [],
            'rejected_reason' => $t->rejected_reason,
            'last_synced_at' => $t->last_synced_at?->toISOString() ?? $t->updated_at->toISOString(),
        ];
    }
}
