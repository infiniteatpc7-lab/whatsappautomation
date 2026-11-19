<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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

    Route::get('/workspace', function () {
        return Inertia::render('Dashboard/Workspace');
    })->name('dashboard.workspace');

    Route::get('/notifications', function () {
        return redirect('/dashboard/overview');
    });
});
