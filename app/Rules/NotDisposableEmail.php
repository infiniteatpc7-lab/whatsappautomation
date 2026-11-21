<?php

declare(strict_types=1);

namespace App\Rules;

use App\Enums\AuthEvent;
use App\Models\AuthLog;
use Closure;
use EragLaravelDisposableEmail\Support\Checker;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Request;

class NotDisposableEmail implements ValidationRule
{
    /**
     * Common disposable domain fallbacks in addition to package sources.
     *
     * @var array<int, string>
     */
    protected array $fallbackDomains = [
        'mailinator.com',
        'tempmail.com',
        'temp-mail.org',
        '10minutemail.com',
        'guerrillamail.com',
        'sharklasers.com',
        'yopmail.com',
        'trashmail.com',
        'dispostable.com',
        'getnada.com',
        'mohmal.com',
        'maildrop.cc',
        'fakeinbox.com',
        'burnermail.io',
        'throwawaymail.com',
    ];

    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $email = strtolower(trim((string) $value));

        if (! str_contains($email, '@')) {
            $fail('The :attribute must be a valid email address.');

            return;
        }

        $parts = explode('@', $email, 2);
        $domain = trim($parts[1] ?? '');

        if ($domain === '' || ! str_contains($domain, '.')) {
            $fail('The :attribute must have a valid domain.');

            return;
        }

        $isDisposable = false;

        // Check fallback domains + subdomain matching
        foreach ($this->fallbackDomains as $disposableDomain) {
            if ($domain === $disposableDomain || str_ends_with($domain, '.'.$disposableDomain)) {
                $isDisposable = true;
                break;
            }
        }

        // Check package Checker
        if (! $isDisposable) {
            try {
                $checker = new Checker;
                $result = $checker->check($email);
                if ($result->disposable()) {
                    $isDisposable = true;
                }
            } catch (\Throwable) {
                // Ignore checker errors
            }
        }

        if ($isDisposable) {
            try {
                AuthLog::create([
                    'email' => $email,
                    'event' => AuthEvent::DISPOSABLE_EMAIL_BLOCKED,
                    'ip_address' => Request::ip(),
                    'user_agent' => substr((string) Request::userAgent(), 0, 500),
                    'metadata' => ['domain' => $domain],
                    'created_at' => now(),
                ]);
            } catch (\Throwable) {
                // Silently continue if DB logging fails during testing/initialization
            }

            $fail('Temporary or disposable email addresses are not allowed. Please use a valid business or personal email.');
        }
    }
}
