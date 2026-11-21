<?php

declare(strict_types=1);

namespace App\Enums;

enum OtpPurpose: string
{
    case VERIFY_EMAIL = 'verify_email';
    case PASSWORD_RESET = 'password_reset';
}
