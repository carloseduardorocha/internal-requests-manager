<?php

namespace App\Notifications\Channels;

use Illuminate\Http\Client\RequestException;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;

class DiscordWebhookChannel
{
    /**
     * Posts the notification payload to the webhook of the on-demand `discord` route.
     * Any failure (4xx, 5xx, timeout) throws, so the queued job is retried.
     *
     * @throws RequestException
     */
    public function send(object $notifiable, Notification $notification): void
    {
        $url = $notifiable->routeNotificationFor('discord', $notification);

        /** @phpstan-ignore method.notFound */
        Http::timeout(10)->post($url, $notification->toDiscord($notifiable))->throw();
    }
}
