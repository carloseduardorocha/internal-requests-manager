<?php

namespace App\Actions\Auth;

use App\Jobs\SendPasswordResetLink as SendPasswordResetLinkJob;

class SendPasswordResetLink
{
    /**
     * Queues the link for any e-mail, with or without an account, so the response is always the same and equally fast.
     */
    public function handle(string $email): void
    {
        SendPasswordResetLinkJob::dispatch($email);
    }
}
