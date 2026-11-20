<?php

namespace App\Enums;

enum WhatsAppAccountStatus: string
{
    case CONNECTED = 'connected';
    case DISCONNECTED = 'disconnected';
    case RESTRICTED = 'restricted';
    case BANNED = 'banned';
    case PENDING = 'pending';
}
