<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\WhatsAppAccount;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyMetaSignature
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $signatureHeader = $request->header('X-Hub-Signature-256');

        if (! $signatureHeader || ! str_starts_with($signatureHeader, 'sha256=')) {
            abort(403, 'Missing or malformed X-Hub-Signature-256 header.');
        }

        $expectedHash = substr($signatureHeader, 7);
        $payload = (string) $request->getContent();

        // 1. Gather candidate secrets
        $candidateSecrets = [];

        // Check for phone_number_id in payload
        $phoneNumberId = $request->input('entry.0.changes.0.value.metadata.phone_number_id');
        if ($phoneNumberId) {
            $account = WhatsAppAccount::where('phone_number_id', (string) $phoneNumberId)->first();
            if ($account && ! empty($account->app_secret)) {
                $candidateSecrets[] = $account->app_secret;
            }
        }

        // Check for WABA ID in entry.0.id for template/WABA-level webhooks
        $entryId = $request->input('entry.0.id');
        if ($entryId) {
            $accounts = WhatsAppAccount::where('waba_id', (string) $entryId)
                ->whereNotNull('app_secret')
                ->get();
            foreach ($accounts as $account) {
                if (! empty($account->app_secret) && ! in_array($account->app_secret, $candidateSecrets, true)) {
                    $candidateSecrets[] = $account->app_secret;
                }
            }
        }

        // Global app secret
        $globalSecret = (string) config('services.meta.app_secret', '');
        if ($globalSecret !== '') {
            $candidateSecrets[] = $globalSecret;
        }

        // Fail closed if zero candidate secrets exist
        if (empty($candidateSecrets)) {
            abort(403, 'No Meta app secret configured for verification.');
        }

        // 2. Validate against candidate secrets
        foreach ($candidateSecrets as $secret) {
            $computedHash = hash_hmac('sha256', $payload, $secret);
            if (hash_equals($computedHash, $expectedHash)) {
                return $next($request);
            }
        }

        abort(403, 'Invalid Meta webhook signature.');
    }
}
