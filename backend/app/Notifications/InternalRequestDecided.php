<?php

namespace App\Notifications;

use App\Enums\InternalRequestStatus;
use App\Enums\NotificationEvent;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Str;

class InternalRequestDecided extends InternalRequestNotification
{
    public function event(): NotificationEvent
    {
        return NotificationEvent::Decided;
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return $notifiable instanceof AnonymousNotifiable ? ['discord'] : ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $request = $this->internalRequest;
        $approved = $request->status === InternalRequestStatus::Approved;

        return (new MailMessage)
            ->subject(__($approved ? 'notifications.mail.approved.subject' : 'notifications.mail.rejected.subject', ['id' => $request->id]))
            ->greeting(__('notifications.mail.greeting', ['name' => $request->requester->name]))
            ->line(__($approved ? 'notifications.mail.approved.intro' : 'notifications.mail.rejected.intro', ['title' => $request->title]))
            ->line(__('notifications.mail.decided.decided_by', ['name' => $request->decidedBy->name]))
            ->line(__('notifications.mail.decided.justification', ['justification' => (string) $request->decision_justification]))
            ->action(
                __('notifications.mail.action'),
                rtrim((string) config('app.frontend_url'), '/').'/requests/'.$request->id,
            );
    }

    /**
     * @return array<string, mixed>
     */
    public function toDiscord(object $notifiable): array
    {
        $request = $this->internalRequest;
        $approved = $request->status === InternalRequestStatus::Approved;

        return [
            'embeds' => [[
                'title' => __($approved ? 'notifications.approved.title' : 'notifications.rejected.title', ['id' => $request->id]),
                'description' => $request->title,
                'url' => $this->requestUrl(),
                'fields' => [
                    ['name' => __('notifications.fields.priority'), 'value' => __('notifications.priority.'.$request->priority->value), 'inline' => true],
                    ['name' => __('notifications.fields.requester'), 'value' => $request->requester->name, 'inline' => true],
                    ['name' => __('notifications.fields.area'), 'value' => $request->area->name, 'inline' => true],
                    ['name' => __('notifications.fields.result'), 'value' => __($approved ? 'notifications.result.approved' : 'notifications.result.rejected'), 'inline' => true],
                    ['name' => __('notifications.fields.decided_by'), 'value' => $request->decidedBy->name, 'inline' => true],
                    ['name' => __('notifications.fields.justification'), 'value' => Str::limit((string) $request->decision_justification, 1021, '...')],
                ],
            ]],
        ];
    }
}
