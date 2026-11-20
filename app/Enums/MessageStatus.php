<?php

namespace App\Enums;

enum MessageStatus: string
{
    case QUEUED = 'queued';
    case SENT = 'sent';
    case DELIVERED = 'delivered';
    case READ = 'read';
    case FAILED = 'failed';

    public function rank(): int
    {
        return match ($this) {
            self::QUEUED => 0,
            self::SENT => 1,
            self::DELIVERED => 2,
            self::READ => 3,
            self::FAILED => 9,
        };
    }
}
