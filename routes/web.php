<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\WorkspaceController;
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
    Route::post('/register', [RegisteredUserController::class, 'store'])->name('register.store');
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

Route::middleware(['auth', 'workspace'])->prefix('dashboard')->group(function () {
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
    Route::get('/account', function () {
        return Inertia::render('Dashboard/Account/Index');
    })->name('dashboard.account');

    Route::get('/workspace', [WorkspaceController::class, 'show'])->name('dashboard.workspace');
    Route::post('/workspace', [WorkspaceController::class, 'store'])->name('dashboard.workspace.store');
    Route::patch('/workspace/{workspace:uuid}', [WorkspaceController::class, 'update'])->name('dashboard.workspace.update');
    Route::post('/workspace/switch/{workspace:uuid}', [WorkspaceController::class, 'switch'])->name('dashboard.workspace.switch');

    Route::post('/workspace/members', [WorkspaceMemberController::class, 'store'])->name('dashboard.workspace.members.store');
    Route::patch('/workspace/members/{user}', [WorkspaceMemberController::class, 'update'])->name('dashboard.workspace.members.update');
    Route::delete('/workspace/members/{user}', [WorkspaceMemberController::class, 'destroy'])->name('dashboard.workspace.members.destroy');

    Route::get('/notifications', function () {
        return Inertia::render('Dashboard/Notifications/Index');
    })->name('dashboard.notifications');
});
