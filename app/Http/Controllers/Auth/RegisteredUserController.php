<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\RegisterUserWithWorkspaceAction;
use App\Enums\AuthEvent;
use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\AuthLog;
use App\Services\Auth\EmailOtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function __construct(
        protected EmailOtpService $otpService,
    ) {}

    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     */
    public function store(RegisterRequest $request, RegisterUserWithWorkspaceAction $action): RedirectResponse
    {
        $result = $action->execute($request->validated());
        $user = $result['user'];

        Auth::login($user);

        $request->session()->regenerate();

        try {
            AuthLog::create([
                'user_id' => $user->id,
                'email' => $user->email,
                'event' => AuthEvent::REGISTERED,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Silently continue
        }

        // Send initial email OTP
        $this->otpService->issue($user, OtpPurpose::VERIFY_EMAIL, $request->ip());

        return redirect()->route('verification.notice');
    }
}
