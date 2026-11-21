<?php

declare(strict_types=1);

namespace App\Http\Requests\WhatsApp;

use App\Models\WhatsAppAccount;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWhatsAppAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', WhatsAppAccount::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'waba_id' => ['required', 'string', 'max:64'],
            'phone_number_id' => ['required', 'string', 'max:64', Rule::unique('whatsapp_accounts', 'phone_number_id')->whereNull('deleted_at')],
            'display_phone_number' => ['required', 'string', 'max:30'],
            'access_token' => ['required', 'string', 'min:20'],
            'app_secret' => ['nullable', 'string', 'max:255'],
            'webhook_verify_token' => ['nullable', 'string', 'min:12', 'max:100'],
            'business_portfolio_id' => ['nullable', 'string', 'max:64'],
            'is_coexistence' => ['nullable', 'boolean'],
        ];
    }
}
