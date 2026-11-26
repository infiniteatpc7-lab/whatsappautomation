<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\OptInStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Models\Contact;
use App\Models\Tag;
use App\Support\WorkspaceContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    /**
     * Display the workspace contacts & audience management page.
     */
    public function index(WorkspaceContext $workspaceContext): Response
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            abort(403, 'No active workspace.');
        }

        $contacts = Contact::forWorkspace($workspace)
            ->with('tags:id,name,color')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Contact $c) => $this->formatContact($c))
            ->values();

        $tags = Tag::forWorkspace($workspace)
            ->orderBy('name')
            ->get(['id', 'name', 'color'])
            ->map(fn (Tag $t) => [
                'id' => (string) $t->id,
                'name' => $t->name,
                'color' => $t->color,
            ])
            ->values();

        $hasConnectedAccount = $workspace->whatsappAccounts()
            ->where('status', WhatsAppAccountStatus::CONNECTED)
            ->exists();

        return Inertia::render('Dashboard/Contacts/Index', [
            'initialContacts' => $contacts,
            'initialTags' => $tags,
            'hasConnectedAccount' => $hasConnectedAccount,
        ]);
    }

    /**
     * Create a new contact in the active workspace.
     */
    public function store(Request $request, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            return response()->json(['message' => 'No active workspace.'], 403);
        }

        $validated = $request->validate([
            'phone' => ['required', 'string', 'min:8', 'max:25'],
            'name' => ['nullable', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:160'],
            'company_name' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:80'],
            'state' => ['nullable', 'string', 'max:80'],
            'opt_in_status' => ['nullable', 'string', 'in:opted_in,opted_out,unknown'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer'],
        ]);

        $waId = $this->normalizePhone($validated['phone']);
        if (strlen($waId) < 8) {
            return response()->json([
                'message' => 'Please enter a valid WhatsApp phone number with country code.',
            ], 422);
        }

        $exists = Contact::query()
            ->where('workspace_id', $workspace->id)
            ->where('wa_id', $waId)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => "A contact with WhatsApp number +{$waId} already exists.",
            ], 422);
        }

        $optInStatus = OptInStatus::tryFrom($validated['opt_in_status'] ?? 'opted_in') ?? OptInStatus::OPTED_IN;

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => $waId,
            'name' => trim((string) ($validated['name'] ?? '')) ?: null,
            'email' => trim((string) ($validated['email'] ?? '')) ?: null,
            'company_name' => trim((string) ($validated['company_name'] ?? '')) ?: null,
            'city' => trim((string) ($validated['city'] ?? '')) ?: null,
            'state' => trim((string) ($validated['state'] ?? '')) ?: null,
            'source' => 'manual',
            'opt_in_status' => $optInStatus,
            'opt_in_source' => $optInStatus === OptInStatus::OPTED_IN ? 'manual' : null,
            'opted_in_at' => $optInStatus === OptInStatus::OPTED_IN ? now() : null,
            'opted_out_at' => $optInStatus === OptInStatus::OPTED_OUT ? now() : null,
        ]);

        if (! empty($validated['tag_ids'])) {
            $validTagIds = Tag::query()
                ->where('workspace_id', $workspace->id)
                ->whereIn('id', $validated['tag_ids'])
                ->pluck('id')
                ->all();
            $contact->tags()->sync($validTagIds);
        }

        $contact->load('tags:id,name,color');

        return response()->json([
            'success' => true,
            'message' => 'Contact added successfully.',
            'contact' => $this->formatContact($contact),
        ], 201);
    }

    /**
     * Update an existing contact.
     */
    public function update(Request $request, Contact $contact, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            return response()->json(['message' => 'No active workspace.'], 403);
        }

        if ((int) $contact->workspace_id !== (int) $workspace->id) {
            return response()->json(['message' => 'Contact not found.'], 404);
        }

        $validated = $request->validate([
            'phone' => ['nullable', 'string', 'min:8', 'max:25'],
            'name' => ['nullable', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:160'],
            'company_name' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:80'],
            'state' => ['nullable', 'string', 'max:80'],
            'opt_in_status' => ['nullable', 'string', 'in:opted_in,opted_out,unknown'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer'],
        ]);

        $updateData = [];
        if (! empty($validated['phone'])) {
            $waId = $this->normalizePhone($validated['phone']);
            if (strlen($waId) < 8) {
                return response()->json([
                    'message' => 'Please enter a valid WhatsApp phone number with country code.',
                ], 422);
            }

            $duplicate = Contact::query()
                ->where('workspace_id', $workspace->id)
                ->where('wa_id', $waId)
                ->where('id', '!=', $contact->id)
                ->exists();

            if ($duplicate) {
                return response()->json([
                    'message' => "Another contact with WhatsApp number +{$waId} already exists.",
                ], 422);
            }

            $updateData['wa_id'] = $waId;
        }
        foreach (['name', 'email', 'company_name', 'city', 'state'] as $field) {
            if (array_key_exists($field, $validated)) {
                $updateData[$field] = trim((string) ($validated[$field] ?? '')) ?: null;
            }
        }

        if (! empty($validated['opt_in_status'])) {
            $newStatus = OptInStatus::from($validated['opt_in_status']);
            $updateData['opt_in_status'] = $newStatus;
            if ($newStatus === OptInStatus::OPTED_IN && ! $contact->opted_in_at) {
                $updateData['opted_in_at'] = now();
            }
            if ($newStatus === OptInStatus::OPTED_OUT) {
                $updateData['opted_out_at'] = now();
            }
        }

        if ($updateData !== []) {
            $contact->update($updateData);
        }

        if (array_key_exists('tag_ids', $validated)) {
            $validTagIds = Tag::query()
                ->where('workspace_id', $workspace->id)
                ->whereIn('id', $validated['tag_ids'] ?? [])
                ->pluck('id')
                ->all();
            $contact->tags()->sync($validTagIds);
        }

        $contact->load('tags:id,name,color');

        return response()->json([
            'success' => true,
            'message' => 'Contact updated successfully.',
            'contact' => $this->formatContact($contact),
        ]);
    }

    /**
     * Soft-delete a contact.
     */
    public function destroy(Contact $contact, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            return response()->json(['message' => 'No active workspace.'], 403);
        }

        if ((int) $contact->workspace_id !== (int) $workspace->id) {
            return response()->json(['message' => 'Contact not found.'], 404);
        }

        $contact->delete();

        return response()->json([
            'success' => true,
            'message' => 'Contact deleted successfully.',
        ]);
    }

    /**
     * Bulk import contacts from parsed CSV rows.
     */
    public function import(Request $request, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            return response()->json(['message' => 'No active workspace.'], 403);
        }

        $validated = $request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:2000'],
            'rows.*.phone' => ['required', 'string', 'max:30'],
            'rows.*.name' => ['nullable', 'string', 'max:120'],
            'rows.*.email' => ['nullable', 'string', 'max:160'],
            'rows.*.company_name' => ['nullable', 'string', 'max:120'],
            'rows.*.city' => ['nullable', 'string', 'max:80'],
            'rows.*.state' => ['nullable', 'string', 'max:80'],
            'opt_in_status' => ['nullable', 'string', 'in:opted_in,opted_out,unknown'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer'],
        ]);

        $optInStatus = OptInStatus::tryFrom($validated['opt_in_status'] ?? 'opted_in') ?? OptInStatus::OPTED_IN;
        $validTagIds = [];
        if (! empty($validated['tag_ids'])) {
            $validTagIds = Tag::query()
                ->where('workspace_id', $workspace->id)
                ->whereIn('id', $validated['tag_ids'])
                ->pluck('id')
                ->all();
        }

        $imported = 0;
        $updated = 0;
        $skipped = 0;

        foreach ($validated['rows'] as $row) {
            $waId = $this->normalizePhone((string) ($row['phone'] ?? ''));
            if (strlen($waId) < 8 || strlen($waId) > 15) {
                $skipped++;

                continue;
            }

            $existing = Contact::withTrashed()
                ->where('workspace_id', $workspace->id)
                ->where('wa_id', $waId)
                ->first();

            $name = trim((string) ($row['name'] ?? '')) ?: null;
            $email = filter_var(trim((string) ($row['email'] ?? '')), FILTER_VALIDATE_EMAIL) ?: null;
            $company = trim((string) ($row['company_name'] ?? '')) ?: null;
            $city = trim((string) ($row['city'] ?? '')) ?: null;
            $state = trim((string) ($row['state'] ?? '')) ?: null;

            if ($existing) {
                if ($existing->trashed()) {
                    $existing->restore();
                }

                $existing->update([
                    'name' => $name ?? $existing->name,
                    'email' => $email ?? $existing->email,
                    'company_name' => $company ?? $existing->company_name,
                    'city' => $city ?? $existing->city,
                    'state' => $state ?? $existing->state,
                ]);

                if ($validTagIds !== []) {
                    $existing->tags()->syncWithoutDetaching($validTagIds);
                }
                $updated++;
            } else {
                $contact = Contact::create([
                    'workspace_id' => $workspace->id,
                    'wa_id' => $waId,
                    'name' => $name,
                    'email' => $email,
                    'company_name' => $company,
                    'city' => $city,
                    'state' => $state,
                    'source' => 'csv_import',
                    'opt_in_status' => $optInStatus,
                    'opt_in_source' => $optInStatus === OptInStatus::OPTED_IN ? 'csv_import' : null,
                    'opted_in_at' => $optInStatus === OptInStatus::OPTED_IN ? now() : null,
                    'opted_out_at' => $optInStatus === OptInStatus::OPTED_OUT ? now() : null,
                ]);

                if ($validTagIds !== []) {
                    $contact->tags()->sync($validTagIds);
                }
                $imported++;
            }
        }

        $contacts = Contact::forWorkspace($workspace)
            ->with('tags:id,name,color')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Contact $c) => $this->formatContact($c))
            ->values();

        return response()->json([
            'success' => true,
            'message' => "Imported {$imported} new, updated {$updated}, skipped {$skipped}.",
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'contacts' => $contacts,
        ]);
    }

    /**
     * Create a tag for segmenting contacts.
     */
    public function storeTag(Request $request, WorkspaceContext $workspaceContext): JsonResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            return response()->json(['message' => 'No active workspace.'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $tagName = trim($validated['name']);
        $tag = Tag::firstOrCreate(
            [
                'workspace_id' => $workspace->id,
                'name' => $tagName,
            ],
            [
                'color' => $validated['color'] ?? 'emerald',
            ]
        );

        return response()->json([
            'success' => true,
            'tag' => [
                'id' => (string) $tag->id,
                'name' => $tag->name,
                'color' => $tag->color,
            ],
        ], 201);
    }

    /**
     * Normalize phone numbers to digits-only E.164 (auto-prefixing 10-digit IN numbers).
     */
    protected function normalizePhone(string $phone): string
    {
        $digits = ltrim(Contact::normalizeWaId($phone), '0');
        if (strlen($digits) === 10) {
            $digits = '91' . $digits;
        }

        return $digits;
    }

    /**
     * Format a contact model for the React frontend.
     *
     * @return array<string, mixed>
     */
    protected function formatContact(Contact $c): array
    {
        return [
            'id' => (string) $c->id,
            'wa_id' => $c->wa_id,
            'name' => $c->name,
            'profile_name' => $c->profile_name,
            'email' => $c->email,
            'company_name' => $c->company_name,
            'city' => $c->city,
            'state' => $c->state,
            'source' => $c->source ?? 'manual',
            'opt_in_status' => $c->opt_in_status instanceof OptInStatus
                ? $c->opt_in_status->value
                : (string) $c->opt_in_status,
            'tags' => $c->tags->map(fn (Tag $t) => [
                'id' => (string) $t->id,
                'name' => $t->name,
                'color' => $t->color,
            ])->values()->all(),
            'created_at' => $c->created_at?->toISOString(),
        ];
    }
}
