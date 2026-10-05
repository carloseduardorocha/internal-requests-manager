<?php

namespace App\Listeners;

use App\Enums\NotificationChannel;
use App\Enums\NotificationStatus;
use App\Models\NotificationLog;
use App\Notifications\InternalRequestNotification;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Notifications\Events\NotificationSent;

class LogNotificationAttempt
{
    public function handle(NotificationSent|NotificationFailed $event): void
    {
        $notification = $event->notification;

        if (! $notification instanceof InternalRequestNotification) {
            return;
        }

        $channel = NotificationChannel::tryFrom($event->channel);

        if ($channel === null) {
            return;
        }

        $failed = $event instanceof NotificationFailed;
        $exception = $failed ? ($event->data['exception'] ?? null) : null;
        $request = $notification->internalRequest;

        // Each event/channel pair is notified once per request, so the attempt is the previous logs plus one.
        $attempt = NotificationLog::query()
            ->where('internal_request_id', $request->id)
            ->where('channel', $channel)
            ->where('event', $notification->event())
            ->count() + 1;

        NotificationLog::create([
            'internal_request_id' => $request->id,
            'channel' => $channel,
            'event' => $notification->event(),
            'attempt' => $attempt,
            'status' => $failed ? NotificationStatus::Failed : NotificationStatus::Sent,
            'error' => $exception instanceof \Throwable ? $exception->getMessage() : null,
        ]);
    }
}
