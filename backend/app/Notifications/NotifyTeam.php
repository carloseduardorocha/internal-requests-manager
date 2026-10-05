<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

class NotifyTeam
{
    /**
     * Sends the notification to the team Discord channel; does nothing when no webhook is configured.
     */
    public function handle(Notification $notification): void
    {
        $url = config('services.discord.webhook_url');

        if (! is_string($url) || $url === '') {
            return;
        }

        NotificationFacade::route('discord', $url)->notify($notification);
    }
}
