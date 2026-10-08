<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === Role::Admin;
    }

    public function update(User $user, User $target): bool
    {
        return $user->role === Role::Admin;
    }

    public function deactivate(User $user, User $target): Response
    {
        if ($user->role !== Role::Admin) {
            return Response::deny();
        }

        return $user->is($target) ? Response::deny(__('users.cannot_deactivate_self')) : Response::allow();
    }

    public function reactivate(User $user, User $target): bool
    {
        return $user->role === Role::Admin;
    }

    public function bulkDeactivate(User $user): bool
    {
        return $user->role === Role::Admin;
    }

    public function bulkReactivate(User $user): bool
    {
        return $user->role === Role::Admin;
    }
}
