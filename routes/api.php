<?php

use App\Http\Controllers\Api\WhatsAppWebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'service' => 'whatsapp-saas',
        ]);
    });
});

Route::prefix('webhooks')->group(function () {
    Route::get('/whatsapp', [WhatsAppWebhookController::class, 'verify'])->name('webhooks.whatsapp.verify');
    Route::post('/whatsapp', [WhatsAppWebhookController::class, 'handle'])
        ->middleware('meta.signature')
        ->name('webhooks.whatsapp.handle');
});
