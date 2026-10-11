<?php

namespace App\Listeners;

use App\Notifications\InternalRequestNotification;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Support\Facades\Log;

class LogNotificationFailure
{
    public function handle(NotificationFailed $event): void
    {
        $exception = $event->data['exception'] ?? null;
        $context = [
            'notification' => class_basename($event->notification),
            'channel' => $event->channel,
        ];

        if ($event->notification instanceof InternalRequestNotification) {
            $context['internal_request_id'] = $event->notification->internalRequest->id;
        }

        // Class only: the message already reaches the worker's error log when the job fails.
        $context['exception'] = $exception instanceof \Throwable ? $exception::class : null;

        Log::warning('notification.failed', $context);
    }
}
