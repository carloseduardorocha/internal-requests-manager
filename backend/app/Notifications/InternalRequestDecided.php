<?php

namespace App\Notifications;

use App\Enums\InternalRequestStatus;
use App\Enums\NotificationEvent;
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
        return ['discord'];
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
                'url' => rtrim((string) config('app.frontend_url'), '/').'/requests/'.$request->id,
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
