<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Enums\WorkspacePlan;
use App\Enums\WorkspaceRole;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RegisterUserWithWorkspaceAction
{
    /**
     * @param  array{name: string, email: string, password: string, workspace_name?: string|null, phone?: string|null}  $data
     * @return array{user: User, workspace: Workspace}
     */
    public function execute(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'phone' => $data['phone'] ?? null,
            ]);

            $workspaceName = ! empty($data['workspace_name']) ? trim($data['workspace_name']) : "{$user->name}'s Workspace";
            $baseSlug = Str::slug($workspaceName);
            if (empty($baseSlug)) {
                $baseSlug = 'workspace';
            }

            $slug = $baseSlug;
            $counter = 1;
            while (Workspace::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }

            $workspace = Workspace::create([
                'owner_id' => $user->id,
                'name' => $workspaceName,
                'slug' => $slug,
                'timezone' => 'Asia/Kolkata',
                'plan' => WorkspacePlan::STARTER,
            ]);

            $workspace->users()->attach($user->id, [
                'role' => WorkspaceRole::OWNER->value,
                'is_available' => true,
            ]);

            $board = KanbanBoard::create([
                'workspace_id' => $workspace->id,
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

            $user->current_workspace_id = $workspace->id;
            $user->save();

            return [
                'user' => $user,
                'workspace' => $workspace,
            ];
        });
    }
}
