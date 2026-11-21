<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\OtpPurpose;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SendEmailOtpNotification extends Notification
{
    public function __construct(
        public readonly string $code,
        public readonly OtpPurpose $purpose,
        public readonly int $expirationMinutes = 10,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $actionText = match ($this->purpose) {
            OtpPurpose::VERIFY_EMAIL => 'Verify your email address',
            OtpPurpose::PASSWORD_RESET => 'Reset your password',
            OtpPurpose::TWO_FACTOR => 'Complete two-factor authentication',
        };

        return (new MailMessage)
            ->subject("Your verification code: {$this->code}")
            ->greeting('Hello!')
            ->line("Use the 6-digit code below to {$actionText}:")
            ->line("# {$this->code}")
            ->line("This code is valid for {$this->expirationMinutes} minutes. For security, never share this code with anyone.")
            ->line('If you did not request this, please ignore this email.');
    }
}
