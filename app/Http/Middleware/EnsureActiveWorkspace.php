<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Models\Workspace;
use App\Support\WorkspaceContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveWorkspace
{
    public function __construct(
        protected WorkspaceContext $workspaceContext,
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $workspace = null;

        if ($user->current_workspace_id) {
            /** @var Workspace|null $workspace */
            $workspace = $user->workspaces()->where('workspaces.id', $user->current_workspace_id)->first();
        }

        if (! $workspace) {
            /** @var Workspace|null $workspace */
            $workspace = $user->workspaces()->first();

            if (! $workspace) {
                abort(403, 'User does not belong to any workspace.');
            }

            $user->forceFill(['current_workspace_id' => $workspace->id])->save();
        }

        $this->workspaceContext->setWorkspace($workspace);
        $request->attributes->set('workspace', $workspace);

        return $next($request);
    }
}
