<?php

namespace App\Notifications;

use App\Enums\NotificationEvent;
use Illuminate\Notifications\Messages\MailMessage;

class InternalRequestAssumed extends InternalRequestNotification
{
    public function event(): NotificationEvent
    {
        return NotificationEvent::Assigned;
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
        $request = $this->internalRequest;

        return (new MailMessage)
            ->subject(__('notifications.mail.assumed.subject', ['id' => $request->id]))
            ->greeting($this->line('notifications.mail.greeting', ['name' => $request->requester->name]))
            ->line($this->line('notifications.mail.assumed.intro', ['title' => $request->title]))
            ->line($this->line('notifications.mail.assumed.assigned_to', ['name' => $request->assignedTo->name]))
            ->action(
                __('notifications.mail.action'),
                $this->requestUrl(),
            );
    }
}
