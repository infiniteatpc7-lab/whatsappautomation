<?php

declare(strict_types=1);

use App\Http\Controllers\AccountController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationOtpController;
use App\Http\Controllers\Auth\PasswordResetOtpController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\SessionSecurityController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
use App\Http\Controllers\WhatsAppAccountController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\WorkspaceInvitationController;
use App\Http\Controllers\WorkspaceMemberController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('dashboard.overview');
});

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login.store');
    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store'])
        ->middleware('throttle:register')
        ->name('register.store');

    // Password reset via OTP
    Route::get('/forgot-password', fn () => Inertia::render('Auth/ForgotPassword'))->name('password.request');
    Route::post('/password/otp/send', [PasswordResetOtpController::class, 'send'])
        ->middleware('throttle:5,15')
        ->name('password.otp.send');
    Route::post('/password/otp/reset', [PasswordResetOtpController::class, 'reset'])
        ->middleware('throttle:10,15')
        ->name('password.otp.reset');

    // Two-factor authentication challenge
    Route::get('/two-factor-challenge', [TwoFactorChallengeController::class, 'create'])->name('two-factor.challenge');
    Route::post('/two-factor-challenge', [TwoFactorChallengeController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('two-factor.verify');
    Route::post('/two-factor-challenge/resend', [TwoFactorChallengeController::class, 'resend'])->name('two-factor.resend');
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

// Email verification OTP (requires auth, but unverified)
Route::middleware('auth')->group(function () {
    Route::get('/verify-email', [EmailVerificationOtpController::class, 'notice'])->name('verification.notice');
    Route::post('/email/otp/verify', [EmailVerificationOtpController::class, 'verify'])
        ->middleware('throttle:10,1')
        ->name('verification.otp.verify');
    Route::post('/email/otp/resend', [EmailVerificationOtpController::class, 'resend'])
        ->name('verification.otp.resend');
});

// Workspace invitation acceptance (requires auth and verified email)
Route::post('/invitations/{token}/accept', [WorkspaceInvitationController::class, 'accept'])
    ->middleware(['auth', 'verified'])
    ->name('invitations.accept');

// Protected Dashboard routes (requires auth, verified email, and active workspace)
Route::middleware(['auth', 'verified', 'workspace'])->prefix('dashboard')->group(function () {
    Route::get('/', function () {
        return redirect()->route('dashboard.overview');
    });

    Route::get('/overview', function () {
        return Inertia::render('Dashboard/Overview');
    })->name('dashboard.overview');

    // Product routes
    Route::get('/product', function () {
        return Inertia::render('Dashboard/Product/Index');
    })->name('dashboard.product');

    Route::get('/product/new', function () {
        return Inertia::render('Dashboard/Product/Show', ['productId' => 'new']);
    })->name('dashboard.product.new');

    Route::get('/product/{productId}', function (string $productId) {
        return Inertia::render('Dashboard/Product/Show', ['productId' => $productId]);
    })->name('dashboard.product.show');

    // Users
    Route::get('/users', function () {
        return Inertia::render('Dashboard/Users/Index');
    })->name('dashboard.users');

    // Kanban
    Route::get('/kanban', function () {
        return Inertia::render('Dashboard/Kanban/Index');
    })->name('dashboard.kanban');

    // Chat
    Route::get('/chat', function () {
        return Inertia::render('Dashboard/Chat/Index');
    })->name('dashboard.chat');

    // AI Chat
    Route::get('/ai-chat', function () {
        return Inertia::render('Dashboard/AIChat/Index');
    })->name('dashboard.ai-chat');

    // Forms
    Route::get('/forms', function () {
        return redirect()->route('dashboard.forms.basic');
    });

    Route::get('/forms/basic', function () {
        return Inertia::render('Dashboard/Forms/Basic');
    })->name('dashboard.forms.basic');

    Route::get('/forms/multi-step', function () {
        return Inertia::render('Dashboard/Forms/MultiStep');
    })->name('dashboard.forms.multi-step');

    Route::get('/forms/sheet-form', function () {
        return Inertia::render('Dashboard/Forms/SheetForm');
    })->name('dashboard.forms.sheet-form');

    Route::get('/forms/advanced', function () {
        return Inertia::render('Dashboard/Forms/Advanced');
    })->name('dashboard.forms.advanced');

    // React Query Demo
    Route::get('/react-query', function () {
        return Inertia::render('Dashboard/ReactQuery/Index');
    })->name('dashboard.react-query');

    // Elements
    Route::get('/elements/icons', function () {
        return Inertia::render('Dashboard/Elements/Icons');
    })->name('dashboard.elements.icons');

    // Account, Workspace & Notifications
    Route::get('/account', [AccountController::class, 'index'])->name('dashboard.account');
    Route::patch('/account/profile', [AccountController::class, 'updateProfile'])->name('dashboard.account.profile');
    Route::patch('/account/two-factor', [AccountController::class, 'updateTwoFactor'])->name('dashboard.account.two-factor');

    Route::post('/account/logout-other-devices', [SessionSecurityController::class, 'logoutOtherDevices'])
        ->name('dashboard.account.logout-other-devices');
    Route::delete('/account/devices/{sessionId}', [SessionSecurityController::class, 'logoutDevice'])
        ->name('dashboard.account.devices.destroy');

    Route::get('/workspace', [WorkspaceController::class, 'show'])->name('dashboard.workspace');
    Route::post('/workspace', [WorkspaceController::class, 'store'])->name('dashboard.workspace.store');
    Route::patch('/workspace/{workspace:uuid}', [WorkspaceController::class, 'update'])->name('dashboard.workspace.update');
    Route::post('/workspace/switch/{workspace:uuid}', [WorkspaceController::class, 'switch'])->name('dashboard.workspace.switch');

    Route::post('/workspace/members', [WorkspaceMemberController::class, 'store'])->name('dashboard.workspace.members.store');
    Route::patch('/workspace/members/{user}', [WorkspaceMemberController::class, 'update'])->name('dashboard.workspace.members.update');
    Route::delete('/workspace/members/{user}', [WorkspaceMemberController::class, 'destroy'])->name('dashboard.workspace.members.destroy');
    Route::delete('/workspace/invitations/{invitation}', [WorkspaceInvitationController::class, 'destroy'])->name('dashboard.workspace.invitations.destroy');

    // WhatsApp Account Management
    Route::get('/whatsapp-accounts', [WhatsAppAccountController::class, 'index'])->name('dashboard.whatsapp-accounts.index');
    Route::post('/whatsapp-accounts', [WhatsAppAccountController::class, 'store'])->name('dashboard.whatsapp-accounts.store');
    Route::patch('/whatsapp-accounts/{whatsappAccount}', [WhatsAppAccountController::class, 'update'])->name('dashboard.whatsapp-accounts.update');
    Route::post('/whatsapp-accounts/{whatsappAccount}/test', [WhatsAppAccountController::class, 'test'])->name('dashboard.whatsapp-accounts.test');
    Route::delete('/whatsapp-accounts/{whatsappAccount}', [WhatsAppAccountController::class, 'destroy'])->name('dashboard.whatsapp-accounts.destroy');

    Route::get('/notifications', function () {
        return Inertia::render('Dashboard/Notifications/Index');
    })->name('dashboard.notifications');
});
