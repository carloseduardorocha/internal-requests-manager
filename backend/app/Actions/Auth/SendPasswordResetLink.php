<?php

namespace App\Actions\Auth;

use Illuminate\Support\Facades\Password;

class SendPasswordResetLink
{
    /**
     * Sends the link when the account exists. The broker status is ignored on purpose,
     * so the response never reveals whether the e-mail has an account.
     */
    public function handle(string $email): void
    {
        Password::sendResetLink(['email' => $email]);
    }
}
