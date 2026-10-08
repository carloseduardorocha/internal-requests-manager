<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class ResetPassword
{
    /**
     * Sets the new password with a one-time token, optionally ending the other sessions.
     * Invalid, expired or used token and unknown e-mail all fail the same way.
     *
     * @throws ValidationException
     */
    public function handle(
        string $email,
        #[\SensitiveParameter] string $token,
        #[\SensitiveParameter] string $password,
        bool $logoutOtherDevices,
    ): void {
        $status = Password::reset(
            [
                'email' => $email,
                'token' => $token,
                'password' => $password,
                // A deactivated account is treated as an unknown e-mail.
                'active' => fn ($query) => $query->whereNull('deactivated_at'),
            ],
            function (User $user, #[\SensitiveParameter] string $password) use ($logoutOtherDevices): void {
                $user->forceFill(['password' => $password]);

                if ($logoutOtherDevices) {
                    $user->logOutEverywhere();
                }

                $user->save();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => __('passwords.token')]);
        }
    }
}
