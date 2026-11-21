<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Enums\AuthEvent;
use App\Models\AuthLog;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
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
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $ipKey = 'login-ip:'.$this->ip();

        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            $strikesKey = 'login-strikes:'.$this->throttleKey();
            $strikes = (int) Cache::get($strikesKey, 0);

            $decay = match (true) {
                $strikes >= 2 => 900,
                $strikes === 1 => 300,
                default => 60,
            };

            RateLimiter::hit($this->throttleKey(), $decay);
            RateLimiter::hit($ipKey, 900);

            if (RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
                Cache::put($strikesKey, $strikes + 1, now()->addHour());
            }

            $this->logEvent(AuthEvent::LOGIN_FAILED);

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
        Cache::forget('login-strikes:'.$this->throttleKey());

        $this->logEvent(AuthEvent::LOGIN_SUCCESS, ['user_id' => Auth::id()]);
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        $ipKey = 'login-ip:'.$this->ip();

        // Layer 2: IP Anti-Password-Spray
        if (RateLimiter::tooManyAttempts($ipKey, 20)) {
            $seconds = RateLimiter::availableIn($ipKey);
            $this->logEvent(AuthEvent::LOGIN_LOCKOUT, ['reason' => 'ip_spray_lockout', 'seconds' => $seconds]);

            throw ValidationException::withMessages([
                'email' => trans('auth.throttle', [
                    'seconds' => $seconds,
                    'minutes' => ceil($seconds / 60),
                ]),
            ]);
        }

        // Layer 1: per email|ip
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());
        $this->logEvent(AuthEvent::LOGIN_LOCKOUT, ['reason' => 'user_lockout', 'seconds' => $seconds]);

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')->toString()).'|'.$this->ip());
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    protected function logEvent(AuthEvent $event, array $metadata = []): void
    {
        try {
            AuthLog::create([
                'user_id' => Auth::id() ?? ($metadata['user_id'] ?? null),
                'email' => (string) $this->input('email'),
                'event' => $event,
                'ip_address' => $this->ip(),
                'user_agent' => substr((string) $this->userAgent(), 0, 500),
                'metadata' => empty($metadata) ? null : $metadata,
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Silently ignore log write errors
        }
    }
}
