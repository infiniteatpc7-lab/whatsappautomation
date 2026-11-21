<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewDeviceLoginNotification extends Notification
{
    public function __construct(
        public readonly string $deviceName,
        public readonly string $browser,
        public readonly string $ipAddress,
        public readonly string $loginTime,
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
        return (new MailMessage)
            ->subject("Security alert: New login from {$this->deviceName}")
            ->greeting("Hello {$notifiable->name}!")
            ->line("Your account ({$notifiable->email}) was just signed into from a new device.")
            ->line("**Device:** {$this->deviceName}")
            ->line("**Browser:** {$this->browser}")
            ->line("**IP Address:** {$this->ipAddress}")
            ->line("**Time:** {$this->loginTime}")
            ->action('Review Active Devices', url('/dashboard/account'))
            ->line('If this was you, you can safely ignore this email.')
            ->line('If you did not initiate this login, your account may be compromised. Please revoke this device immediately in your Account settings and update your password.');
    }
}
