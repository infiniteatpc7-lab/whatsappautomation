<?php

namespace App\Enums;

enum ConversationStatus: string
{
    case OPEN = 'open';
    case RESOLVED = 'resolved';
    case PENDING = 'pending';
    case EXPIRED = 'expired';
}
