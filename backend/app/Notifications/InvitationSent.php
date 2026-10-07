<?php

namespace App\Notifications;

use App\Models\Invitation;
use App\Notifications\Concerns\EscapesUserText;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Carries the plain token, so the queued payload is encrypted and nothing here may log it.
 */
class InvitationSent extends Notification implements ShouldBeEncrypted, ShouldQueue
{
    use EscapesUserText, Queueable;

    public int $tries = 4;

    public function __construct(public Invitation $invitation, private string $token)
    {
        $this->afterCommit();
    }

    /**
     * Seconds to wait before each retry (ADR 0005).
     *
     * @return list<int>
     */
    public function backoff(): array
    {
        return [60, 300, 900];
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $invitation = $this->invitation;

        return (new MailMessage)
            ->subject(__('notifications.mail.invitation.subject'))
            ->greeting($this->line('notifications.mail.greeting', ['name' => $invitation->name]))
            ->line(__('notifications.mail.invitation.intro'))
            ->line($this->line('notifications.mail.invitation.profile', [
                'role' => __('notifications.role.'.$invitation->role->value),
                'area' => $invitation->area->name,
            ]))
            ->action(__('notifications.mail.invitation.action'), $this->acceptUrl())
            ->line(__('notifications.mail.invitation.expires', [
                'date' => $invitation->expires_at->timezone(config('app.timezone'))->format('d/m/Y'),
            ]));
    }

    private function acceptUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/accept-invitation?token='.$this->token;
    }
}
