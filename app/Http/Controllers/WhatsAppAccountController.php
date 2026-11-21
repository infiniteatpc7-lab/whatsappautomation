<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\WhatsAppAccountStatus;
use App\Enums\WhatsAppConnectionType;
use App\Exceptions\MetaApiException;
use App\Http\Requests\WhatsApp\StoreWhatsAppAccountRequest;
use App\Http\Requests\WhatsApp\UpdateWhatsAppAccountRequest;
use App\Models\WhatsAppAccount;
use App\Services\WhatsApp\MetaCloudClient;
use App\Support\WorkspaceContext;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WhatsAppAccountController extends Controller
{
    use AuthorizesRequests;

    /**
     * List all WhatsApp accounts for the active workspace.
     */
    public function index(Request $request, WorkspaceContext $workspaceContext): JsonResponse
    {
        $this->authorize('viewAny', WhatsAppAccount::class);

        $workspace = $workspaceContext->getWorkspace();
        if (! $workspace) {
            return response()->json([], 200);
        }

        $accounts = WhatsAppAccount::where('workspace_id', $workspace->id)
            ->get()
            ->map(fn (WhatsAppAccount $a): array => [
                'id' => $a->id,
                'connection_type' => $a->connection_type->value,
                'is_coexistence' => (bool) $a->is_coexistence,
                'waba_id' => $a->waba_id,
                'phone_number_id' => $a->phone_number_id,
                'display_phone_number' => $a->display_phone_number,
                'verified_name' => $a->verified_name,
                'quality_rating' => $a->quality_rating,
                'messaging_limit_tier' => $a->messaging_limit_tier,
                'status' => $a->status->value,
                'last_synced_at' => $a->last_synced_at?->toISOString(),
                'webhook_url' => rtrim((string) config('app.url', url('/')), '/') . '/api/webhooks/whatsapp',
                'has_access_token' => ! empty($a->access_token),
                'has_app_secret' => ! empty($a->app_secret),
            ]);

        return response()->json($accounts);
    }

    /**
     * Store a manually configured WhatsApp account.
     */
    public function store(StoreWhatsAppAccountRequest $request, WorkspaceContext $workspaceContext): JsonResponse|RedirectResponse
    {
        $workspace = $workspaceContext->getWorkspace();
        $validated = $request->validated();

        // If a previously soft-deleted account exists with this phone_number_id, clean it up
        WhatsAppAccount::withTrashed()
            ->where('phone_number_id', $validated['phone_number_id'])
            ->forceDelete();

        $account = WhatsAppAccount::create([
            'workspace_id' => $workspace->id,
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'waba_id' => $validated['waba_id'],
            'phone_number_id' => $validated['phone_number_id'],
            'display_phone_number' => $validated['display_phone_number'],
            'access_token' => $validated['access_token'],
            'app_secret' => $validated['app_secret'] ?? null,
            'webhook_verify_token' => ! empty($validated['webhook_verify_token'])
                ? $validated['webhook_verify_token']
                : Str::random(40),
            'business_portfolio_id' => $validated['business_portfolio_id'] ?? null,
            'is_coexistence' => (bool) ($validated['is_coexistence'] ?? false),
            'status' => WhatsAppAccountStatus::PENDING,
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'WhatsApp account created successfully.',
                'account' => [
                    'id' => $account->id,
                    'phone_number_id' => $account->phone_number_id,
                    'display_phone_number' => $account->display_phone_number,
                    'status' => $account->status->value,
                ],
            ], 201);
        }

        return back()->with('success', 'WhatsApp account created successfully.');
    }

    /**
     * Update an existing WhatsApp account.
     */
    public function update(UpdateWhatsAppAccountRequest $request, WhatsAppAccount $whatsappAccount): JsonResponse|RedirectResponse
    {
        $validated = $request->validated();

        // If access_token is empty or omitted, preserve existing encrypted value
        if (array_key_exists('access_token', $validated) && empty($validated['access_token'])) {
            unset($validated['access_token']);
        }

        // If app_secret is empty or omitted, preserve existing encrypted value
        if (array_key_exists('app_secret', $validated) && empty($validated['app_secret'])) {
            unset($validated['app_secret']);
        }

        $whatsappAccount->update($validated);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'WhatsApp account updated successfully.',
                'account' => [
                    'id' => $whatsappAccount->id,
                    'phone_number_id' => $whatsappAccount->phone_number_id,
                    'display_phone_number' => $whatsappAccount->display_phone_number,
                    'status' => $whatsappAccount->status->value,
                ],
            ]);
        }

        return back()->with('success', 'WhatsApp account updated successfully.');
    }

    /**
     * Test connection with Meta Graph API and sync phone number details.
     */
    public function test(Request $request, WhatsAppAccount $whatsappAccount, MetaCloudClient $client): JsonResponse|RedirectResponse
    {
        $this->authorize('update', $whatsappAccount);

        try {
            $data = $client->verifyPhoneNumber($whatsappAccount->phone_number_id, $whatsappAccount->access_token);

            $whatsappAccount->update([
                'display_phone_number' => $data['display_phone_number'] ?? $whatsappAccount->display_phone_number,
                'verified_name' => $data['verified_name'] ?? $whatsappAccount->verified_name,
                'quality_rating' => $data['quality_rating'] ?? $whatsappAccount->quality_rating,
                'messaging_limit_tier' => $data['messaging_limit_tier'] ?? $whatsappAccount->messaging_limit_tier,
                'status' => WhatsAppAccountStatus::CONNECTED,
                'last_synced_at' => now(),
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'WhatsApp account verified and connected successfully.',
                    'account' => [
                        'id' => $whatsappAccount->id,
                        'status' => WhatsAppAccountStatus::CONNECTED->value,
                        'verified_name' => $whatsappAccount->verified_name,
                        'quality_rating' => $whatsappAccount->quality_rating,
                        'messaging_limit_tier' => $whatsappAccount->messaging_limit_tier,
                    ],
                ]);
            }

            return back()->with('success', 'WhatsApp account verified and connected successfully.');
        } catch (MetaApiException $e) {
            $whatsappAccount->update([
                'status' => WhatsAppAccountStatus::ERROR,
            ]);

            $safeError = $e->getMessage();

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Failed to connect to Meta WhatsApp Cloud API.',
                    'error' => $safeError,
                ], 422);
            }

            return back()->with('error', "Failed to connect to Meta: {$safeError}");
        }
    }

    /**
     * Soft delete a WhatsApp account.
     */
    public function destroy(Request $request, WhatsAppAccount $whatsappAccount): JsonResponse|RedirectResponse
    {
        $this->authorize('delete', $whatsappAccount);

        $whatsappAccount->delete();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'WhatsApp account removed successfully.',
            ]);
        }

        return back()->with('success', 'WhatsApp account removed successfully.');
    }
}
