<?php

namespace App\Enums;

enum MessageSenderType: string
{
    case CONTACT = 'contact';
    case AGENT = 'agent';
    case BOT = 'bot';
    case SYSTEM = 'system';
    case CAMPAIGN = 'campaign';
}
