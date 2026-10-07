<?php

namespace App\Notifications;

use App\Enums\NotificationEvent;
use App\Models\InternalRequest;
use App\Notifications\Concerns\EscapesUserText;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

abstract class InternalRequestNotification extends Notification implements ShouldQueue
{
    use EscapesUserText, Queueable;

    public int $tries = 4;

    public function __construct(public InternalRequest $internalRequest)
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

    abstract public function event(): NotificationEvent;

    /**
     * Link to the request detail in the front-end.
     */
    protected function requestUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/requests/'.$this->internalRequest->id;
    }
}
