<?php

namespace App\Providers;

use App\Notifications\Channels\DiscordWebhookChannel;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Notification::extend('discord', fn ($app) => $app->make(DiscordWebhookChannel::class));
    }
}
