<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Workspace;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WorkspaceInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Workspace $workspace,
        public readonly string $token,
        public readonly string $role,
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
        $acceptUrl = url("/invitations/{$this->token}/accept");

        return (new MailMessage)
            ->subject("You've been invited to join {$this->workspace->name}")
            ->greeting("Hello!")
            ->line("You have been invited to join the workspace **{$this->workspace->name}** with the role of **{$this->role}**.")
            ->action('Accept Invitation', $acceptUrl)
            ->line('This invitation will expire in 7 days.')
            ->line('If you did not expect this invitation, you can ignore this email.');
    }
}
