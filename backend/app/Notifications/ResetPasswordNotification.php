<?php

namespace App\Notifications;

use App\Notifications\Concerns\EscapesUserText;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Password reset link mail. Encrypted on the queue because the payload carries the plain token.
 */
class ResetPasswordNotification extends Notification implements ShouldBeEncrypted, ShouldQueue
{
    use EscapesUserText, Queueable;

    public int $tries = 4;

    public function __construct(public string $token)
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
        return (new MailMessage)
            ->subject(__('notifications.mail.password_reset.subject'))
            ->greeting($this->line('notifications.mail.greeting', ['name' => $notifiable->name]))
            ->line(__('notifications.mail.password_reset.intro'))
            ->action(__('notifications.mail.password_reset.action'), $this->resetUrl($notifiable))
            ->line(__('notifications.mail.password_reset.expires', [
                'minutes' => (int) config('auth.passwords.users.expire'),
            ]))
            ->line(__('notifications.mail.password_reset.ignore'));
    }

    /**
     * Link to the new password screen in the front-end.
     */
    private function resetUrl(object $notifiable): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], '', '&', PHP_QUERY_RFC3986);
    }
}
