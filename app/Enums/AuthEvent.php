<?php

declare(strict_types=1);

namespace App\Enums;

enum AuthEvent: string
{
    case REGISTERED = 'registered';
    case LOGIN_SUCCESS = 'login_success';
    case LOGIN_FAILED = 'login_failed';
    case LOGIN_LOCKOUT = 'login_lockout';
    case OTP_SENT = 'otp_sent';
    case OTP_VERIFIED = 'otp_verified';
    case OTP_FAILED = 'otp_failed';
    case PASSWORD_RESET = 'password_reset';
    case LOGOUT = 'logout';
    case LOGOUT_OTHER_DEVICES = 'logout_other_devices';
    case DISPOSABLE_EMAIL_BLOCKED = 'disposable_email_blocked';
}
