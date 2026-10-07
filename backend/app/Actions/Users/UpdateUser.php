<?php

namespace App\Actions\Users;

use App\Models\User;

class UpdateUser
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function handle(User $user, array $attributes): User
    {
        $user->update(array_intersect_key($attributes, array_flip(['name', 'role', 'area_id'])));

        return $user;
    }
}
