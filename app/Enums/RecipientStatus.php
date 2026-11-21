<?php

namespace App\Enums;

enum RecipientStatus: string
{
    case PENDING = 'pending';
    case QUEUED = 'queued';
    case SENT = 'sent';
    case DELIVERED = 'delivered';
    case READ = 'read';
    case FAILED = 'failed';
    case SKIPPED = 'skipped';
}
