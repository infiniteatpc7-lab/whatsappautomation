<?php

namespace App\Enums;

enum ConversationStatus: string
{
    case OPEN = 'open';
    case RESOLVED = 'resolved';
    case PENDING = 'pending';
    case SNOOZED = 'snoozed';
    case EXPIRED = 'expired';
}
