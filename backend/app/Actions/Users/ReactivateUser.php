<?php

namespace App\Actions\Users;

use App\Models\User;

class ReactivateUser
{
    /**
     * Gives the access back with the same password. Doing it again changes nothing.
     */
    public function handle(User $user): User
    {
        $user->update(['deactivated_at' => null]);

        return $user;
    }
}
