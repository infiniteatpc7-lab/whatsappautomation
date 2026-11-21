<?php

declare(strict_types=1);

namespace App\Http\Requests\Workspace;

use App\Models\Workspace;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateWorkspaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Workspace|null $workspace */
        $workspace = $this->route('workspace');

        return $workspace ? $this->user()?->can('update', $workspace) ?? false : false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'timezone' => ['sometimes', 'required', 'string', 'timezone:all'],
            'settings' => ['nullable', 'array'],
        ];
    }
}
