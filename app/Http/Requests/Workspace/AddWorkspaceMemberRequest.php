<?php

declare(strict_types=1);

namespace App\Http\Requests\Workspace;

use App\Models\Workspace;
use App\Support\WorkspaceContext;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddWorkspaceMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Workspace|null $workspace */
        $workspace = app(WorkspaceContext::class)->getWorkspace() ?? $this->user()?->currentWorkspace;

        return $workspace ? $this->user()?->can('manageMembers', $workspace) ?? false : false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'exists:users,email'],
            'role' => ['required', 'string', Rule::in(['admin', 'manager', 'supervisor', 'agent'])],
        ];
    }
}
