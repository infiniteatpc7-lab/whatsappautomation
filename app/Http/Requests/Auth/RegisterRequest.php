<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Rules\NotDisposableEmail;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge([
                'email' => Str::lower(trim((string) $this->input('email'))),
            ]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
                new NotDisposableEmail,
            ],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'workspace_name' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:25'],
        ];
    }
}
