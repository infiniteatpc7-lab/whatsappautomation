<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Auth\DeviceSessionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    /**
     * Display the account settings view.
     */
    public function index(Request $request, DeviceSessionService $deviceService): Response
    {
        /** @var User $user */
        $user = $request->user();

        $devices = $deviceService->getActiveDevices($user, $request->session()->getId());

        return Inertia::render('Dashboard/Account/Index', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? '',
                'two_factor_enabled' => (bool) $user->two_factor_enabled,
                'created_at' => $user->created_at?->format('Y-m-d') ?? now()->format('Y-m-d'),
            ],
            'devices' => $devices,
        ]);
    }

    /**
     * Update user profile information.
     */
    public function updateProfile(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $user->update($validated);

        return back()->with('success', 'Profile updated successfully.');
    }

    /**
     * Toggle Two-Factor Authentication.
     */
    public function updateTwoFactor(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $user->forceFill(['two_factor_enabled' => $validated['enabled']])->save();

        $statusText = $validated['enabled'] ? 'enabled' : 'disabled';

        return back()->with('success', "Two-factor authentication {$statusText} successfully.");
    }
}
