<?php

namespace App\Notifications;

use App\Enums\NotificationEvent;
use App\Models\InternalRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

abstract class InternalRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;

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
}
