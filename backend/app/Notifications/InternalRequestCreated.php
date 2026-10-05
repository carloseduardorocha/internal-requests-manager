<?php

namespace App\Notifications;

use App\Enums\NotificationEvent;

class InternalRequestCreated extends InternalRequestNotification
{
    public function event(): NotificationEvent
    {
        return NotificationEvent::Created;
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['discord'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDiscord(object $notifiable): array
    {
        $request = $this->internalRequest;

        return [
            'embeds' => [[
                'title' => __('notifications.created.title', ['id' => $request->id]),
                'description' => $request->title,
                'url' => rtrim((string) config('app.frontend_url'), '/').'/requests/'.$request->id,
                'fields' => [
                    ['name' => __('notifications.fields.priority'), 'value' => __('notifications.priority.'.$request->priority->value), 'inline' => true],
                    ['name' => __('notifications.fields.requester'), 'value' => $request->requester->name, 'inline' => true],
                    ['name' => __('notifications.fields.area'), 'value' => $request->area->name, 'inline' => true],
                ],
            ]],
        ];
    }
}
