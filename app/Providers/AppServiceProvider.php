<?php

declare(strict_types=1);

namespace App\Providers;

use App\Support\WorkspaceContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(WorkspaceContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (request()->header('X-Forwarded-Proto') === 'https' || (str_starts_with((string) config('app.url'), 'https://') && ! in_array(request()->getHost(), ['localhost', '127.0.0.1'], true))) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }

        Password::defaults(function () {
            $rule = Password::min(8)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols();

            return $this->app->isProduction()
                ? $rule->uncompromised()
                : $rule;
        });

        RateLimiter::for('register', function (Request $request): Limit {
            return Limit::perHour(5)->by($request->ip() ?? '127.0.0.1');
        });
    }
}
