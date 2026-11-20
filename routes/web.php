<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/login', function () {
    return Inertia::render('Auth/Login');
})->name('login');

Route::get('/register', function () {
    return Inertia::render('Auth/Register');
})->name('register');

Route::get('/', function () {
    return redirect('/dashboard/overview');
});

Route::prefix('dashboard')->group(function () {
    Route::get('/', function () {
        return redirect('/dashboard/overview');
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
        return redirect('/dashboard/forms/basic');
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

    Route::get('/workspace', function () {
        return Inertia::render('Dashboard/Workspace');
    })->name('dashboard.workspace');

    Route::get('/notifications', function () {
        return Inertia::render('Dashboard/Notifications/Index');
    })->name('dashboard.notifications');
});
