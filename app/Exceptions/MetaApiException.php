<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Http\Client\Response;
use RuntimeException;
use Throwable;

class MetaApiException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $rawResponse
     */
    public function __construct(
        string $message,
        public readonly ?int $httpStatus = null,
        public readonly ?int $metaErrorCode = null,
        public readonly ?int $metaErrorSubcode = null,
        public readonly ?string $fbTraceId = null,
        public readonly array $rawResponse = [],
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, $metaErrorCode ?? 0, $previous);
    }

    public static function fromResponse(Response $response): self
    {
        $json = $response->json() ?? [];
        $error = $json['error'] ?? [];

        $message = $error['message'] ?? 'Meta API request failed with status '.$response->status();
        $code = isset($error['code']) ? (int) $error['code'] : null;
        $subcode = isset($error['error_subcode']) ? (int) $error['error_subcode'] : null;
        $traceId = isset($error['fbtrace_id']) ? (string) $error['fbtrace_id'] : null;

        return new self(
            message: $message,
            httpStatus: $response->status(),
            metaErrorCode: $code,
            metaErrorSubcode: $subcode,
            fbTraceId: $traceId,
            rawResponse: $json,
        );
    }
}
