<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\WhatsAppAccountStatus;
use App\Enums\WorkspacePlan;
use App\Enums\WorkspaceRole;
use App\Models\User;
use App\Models\Workspace;
use App\Support\WorkspaceContext;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => function () use ($request): ?array {
                    /** @var User|null $user */
                    $user = $request->user();
                    if (! $user) {
                        return null;
                    }

                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone,
                        'avatar_url' => $user->avatar_url,
                        'current_workspace_id' => $user->current_workspace_id,
                        'email_verified' => $user->hasVerifiedEmail(),
                        'two_factor_enabled' => (bool) $user->two_factor_enabled,
                    ];
                },
                'workspace' => function () use ($request): ?array {
                    /** @var User|null $user */
                    $user = $request->user();
                    if (! $user) {
                        return null;
                    }

                    /** @var Workspace|null $workspace */
                    $workspace = app(WorkspaceContext::class)->getWorkspace()
                        ?? ($user->current_workspace_id ? $user->currentWorkspace : null)
                        ?? $user->workspaces()->first();

                    if (! $workspace) {
                        return null;
                    }

                    $member = $workspace->users()->where('users.id', $user->id)->first();
                    $role = $member?->pivot?->role instanceof WorkspaceRole
                        ? $member->pivot->role->value
                        : ($member?->pivot?->role ?? ($workspace->owner_id === $user->id ? WorkspaceRole::OWNER->value : WorkspaceRole::AGENT->value));

                    return [
                        'id' => $workspace->id,
                        'uuid' => $workspace->uuid,
                        'name' => $workspace->name,
                        'slug' => $workspace->slug,
                        'timezone' => $workspace->timezone,
                        'plan' => $workspace->plan instanceof WorkspacePlan ? $workspace->plan->value : (string) $workspace->plan,
                        'role' => $role,
                        'has_whatsapp' => $workspace->whatsappAccounts()->where('status', WhatsAppAccountStatus::CONNECTED)->exists(),
                        'has_whatsapp' => $workspace->whatsappAccounts()->where('status', \App\Enums\WhatsAppAccountStatus::CONNECTED)->exists(),
                    ];
                },
                'workspaces' => function () use ($request): array {
                    /** @var User|null $user */
                    $user = $request->user();
                    if (! $user) {
                        return [];
                    }

                    return $user->workspaces->map(function (Workspace $ws) use ($user): array {
                        $role = $ws->pivot?->role instanceof WorkspaceRole
                            ? $ws->pivot->role->value
                            : ($ws->pivot?->role ?? ($ws->owner_id === $user->id ? WorkspaceRole::OWNER->value : WorkspaceRole::AGENT->value));

                        return [
                            'id' => $ws->id,
                            'uuid' => $ws->uuid,
                            'name' => $ws->name,
                            'slug' => $ws->slug,
                            'plan' => $ws->plan instanceof WorkspacePlan ? $ws->plan->value : (string) $ws->plan,
                            'role' => $role,
                        ];
                    })->all();
                },
            ],
            'flash' => [
                'success' => fn (): mixed => $request->session()->get('success'),
                'error' => fn (): mixed => $request->session()->get('error'),
            ],
        ];
    }
}
