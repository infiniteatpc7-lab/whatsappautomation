<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\WhatsAppAccountStatus;
use App\Enums\WorkspacePlan;
use App\Enums\WorkspaceRole;
use App\Http\Requests\Workspace\CreateWorkspaceRequest;
use App\Http\Requests\Workspace\UpdateWorkspaceRequest;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\User;
use App\Models\WhatsAppAccount;
use App\Models\Workspace;
use App\Support\WorkspaceContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function show(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        /** @var Workspace|null $workspace */
        $workspace = app(WorkspaceContext::class)->getWorkspace()
            ?? ($user->current_workspace_id ? $user->currentWorkspace : null)
            ?? $user->workspaces()->first();

        if (! $workspace) {
            abort(403, 'No active workspace found.');
        }

        $members = $workspace->users()->get()->map(function (User $member) use ($workspace, $user): array {
            $role = $member->pivot?->role instanceof WorkspaceRole
                ? $member->pivot->role->value
                : ($member->pivot?->role ?? ($workspace->owner_id === $member->id ? 'owner' : 'agent'));

            return [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'avatar_url' => $member->avatar_url,
                'role' => $role,
                'is_available' => (bool) ($member->pivot?->is_available ?? true),
                'is_you' => $member->id === $user->id,
                'is_owner' => $member->id === $workspace->owner_id,
            ];
        })->all();

        /** @var WhatsAppAccount|null $account */
        $account = $workspace->whatsappAccounts()->first();

        $whatsappAccount = $account ? [
            'id' => $account->id,
            'waba_id' => $account->waba_id,
            'phone_number_id' => $account->phone_number_id,
            'phone_number' => $account->display_phone_number,
            'display_phone_number' => $account->display_phone_number,
            'status' => $account->status instanceof WhatsAppAccountStatus ? $account->status->value : (string) $account->status,
            'verified_name' => $account->verified_name,
            'quality_rating' => $account->quality_rating,
            'tier' => $account->messaging_limit_tier,
            'webhook_verify_token' => $account->webhook_verify_token,
            'webhook_url' => rtrim((string) config('app.url', url('/')), '/') . '/api/webhooks/whatsapp',
            'last_synced_at' => $account->last_synced_at?->diffForHumans() ?? $account->last_synced_at?->toISOString(),
            'has_access_token' => ! empty($account->access_token),
            'has_app_secret' => ! empty($account->app_secret),
            'has_webhook_verify_token' => ! empty($account->webhook_verify_token),
        ] : null;

        $pendingInvitations = $workspace->invitations()
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->get(['id', 'email', 'role', 'expires_at', 'created_at'])
            ->map(fn ($inv) => [
                'id' => $inv->id,
                'email' => $inv->email,
                'role' => $inv->role instanceof WorkspaceRole ? $inv->role->value : (string) $inv->role,
                'expires_at' => $inv->expires_at?->toISOString(),
                'created_at' => $inv->created_at?->toISOString(),
            ]);

        return Inertia::render('Dashboard/Workspace', [
            'workspace' => [
                'id' => $workspace->id,
                'uuid' => $workspace->uuid,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
                'timezone' => $workspace->timezone,
                'plan' => $workspace->plan instanceof WorkspacePlan ? $workspace->plan->value : (string) $workspace->plan,
            ],
            'members' => $members,
            'pendingInvitations' => $pendingInvitations,
            'whatsappAccount' => $whatsappAccount,
        ]);
    }

    public function store(CreateWorkspaceRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();

        $workspace = DB::transaction(function () use ($user, $validated): Workspace {
            $baseSlug = Str::slug($validated['name']);
            if (empty($baseSlug)) {
                $baseSlug = 'workspace';
            }

            $slug = $baseSlug;
            $counter = 1;
            while (Workspace::withTrashed()->where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }

            $ws = Workspace::create([
                'owner_id' => $user->id,
                'name' => $validated['name'],
                'slug' => $slug,
                'timezone' => $validated['timezone'] ?? 'Asia/Kolkata',
                'plan' => WorkspacePlan::STARTER,
            ]);

            $ws->users()->attach($user->id, [
                'role' => WorkspaceRole::OWNER->value,
                'is_available' => true,
            ]);

            $board = KanbanBoard::create([
                'workspace_id' => $ws->id,
                'name' => 'Main Pipeline',
                'type' => 'leads',
            ]);

            $defaultColumns = [
                ['title' => 'New Lead', 'position' => 0, 'color' => '#3b82f6'],
                ['title' => 'Contacted', 'position' => 1, 'color' => '#eab308'],
                ['title' => 'Qualified', 'position' => 2, 'color' => '#8b5cf6'],
                ['title' => 'Won', 'position' => 3, 'color' => '#22c55e'],
            ];

            foreach ($defaultColumns as $col) {
                KanbanColumn::create([
                    'board_id' => $board->id,
                    'title' => $col['title'],
                    'position' => $col['position'],
                    'color' => $col['color'],
                ]);
            }

            $user->current_workspace_id = $ws->id;
            $user->save();

            return $ws;
        });

        app(WorkspaceContext::class)->setWorkspace($workspace);

        return redirect()->route('dashboard.workspace')->with('success', 'Workspace created successfully.');
    }

    public function update(UpdateWorkspaceRequest $request, Workspace $workspace): RedirectResponse
    {
        $validated = $request->validated();

        if (isset($validated['settings']) && is_array($validated['settings'])) {
            $allowedKeys = ['currency', 'industry', 'business_hours', 'auto_assign_chats'];
            $existing = is_array($workspace->settings) ? $workspace->settings : [];
            $filtered = array_intersect_key($validated['settings'], array_flip($allowedKeys));
            $validated['settings'] = array_merge($existing, $filtered);
        }

        $workspace->update($validated);

        return back()->with('success', 'Workspace settings updated.');
    }

    public function switch(Request $request, Workspace $workspace): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->workspaces()->where('workspaces.id', $workspace->id)->exists()) {
            abort(403, 'Unauthorized workspace switch.');
        }

        $user->forceFill(['current_workspace_id' => $workspace->id])->save();
        app(WorkspaceContext::class)->setWorkspace($workspace);

        return back()->with('success', "Switched to {$workspace->name}.");
    }
}
