<?php

namespace App\Notifications\Channels;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;

class DiscordWebhookChannel
{
    /**
     * Posts the notification payload to the configured Discord webhook.
     * The URL is a secret, so it is read from config (never from the queued route) and
     * kept out of exception messages. Any failure (4xx, 5xx, timeout) throws, so the job is retried.
     *
     * @throws \RuntimeException
     */
    public function send(object $notifiable, Notification $notification): void
    {
        $url = (string) config('services.discord.webhook_url');

        try {
            /** @phpstan-ignore method.notFound */
            Http::timeout(10)->post($url, $notification->toDiscord($notifiable))->throw();
        } catch (RequestException $e) {
            throw new \RuntimeException("Discord webhook responded with status {$e->response->status()}");
        } catch (ConnectionException) {
            throw new \RuntimeException('Discord webhook connection failed (timeout or network error)');
        }
    }
}
