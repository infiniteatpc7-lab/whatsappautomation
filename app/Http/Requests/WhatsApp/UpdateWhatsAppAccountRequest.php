<?php

declare(strict_types=1);

namespace App\Http\Requests\WhatsApp;

use App\Models\WhatsAppAccount;
use Illuminate\Foundation\Http\FormRequest;

class UpdateWhatsAppAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var WhatsAppAccount|null $account */
        $account = $this->route('whatsappAccount');

        return $account !== null && ($this->user()?->can('update', $account) ?? false);
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'waba_id' => ['sometimes', 'required', 'string', 'max:64'],
            'display_phone_number' => ['sometimes', 'required', 'string', 'max:30'],
            'access_token' => ['nullable', 'string'],
            'app_secret' => ['nullable', 'string', 'max:255'],
            'webhook_verify_token' => ['nullable', 'string', 'min:12', 'max:100'],
            'business_portfolio_id' => ['nullable', 'string', 'max:64'],
            'is_coexistence' => ['nullable', 'boolean'],
        ];
    }
}
