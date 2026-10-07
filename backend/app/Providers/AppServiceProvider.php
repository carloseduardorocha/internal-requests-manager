<?php

namespace App\Providers;

use App\Notifications\Channels\DiscordWebhookChannel;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

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
        Password::defaults(fn () => Password::min(8));

        Notification::extend('discord', fn ($app) => $app->make(DiscordWebhookChannel::class));
    }
}
