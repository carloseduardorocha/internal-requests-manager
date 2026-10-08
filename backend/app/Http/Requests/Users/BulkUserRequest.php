<?php

namespace App\Http\Requests\Users;

use App\Http\Requests\BulkIdsRequest;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class BulkUserRequest extends BulkIdsRequest
{
    public function authorize(): Response
    {
        $ability = match ($this->route()?->getActionMethod()) {
            'deactivate' => 'bulkDeactivate',
            'reactivate' => 'bulkReactivate',
            default => null,
        };

        if ($ability === null) {
            return Response::deny();
        }

        return Gate::inspect($ability, User::class);
    }
}
