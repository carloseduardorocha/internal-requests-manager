<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeactivateUser
{
    /**
     * Deactivates the account and ends its sessions at once. Doing it again changes nothing.
     */
    public function handle(User $user): User
    {
        return DB::transaction(function () use ($user): User {
            $current = User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();

            if ($current->deactivated_at === null) {
                $current->deactivated_at = now();
                $current->logOutEverywhere();
                $current->save();
            }

            return $current;
        });
    }
}
