<?php

namespace App\Enums;

enum WhatsAppConnectionType: string
{
    case MANUAL = 'manual';
    case EMBEDDED_SIGNUP = 'embedded_signup';
}
