<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;

class AreaPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === Role::Admin;
    }
}
