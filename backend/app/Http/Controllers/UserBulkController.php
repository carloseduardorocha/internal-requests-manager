<?php

namespace App\Http\Controllers;

use App\Actions\Users\BulkDeactivateUsers;
use App\Actions\Users\BulkReactivateUsers;
use App\Http\Requests\Users\BulkUserRequest;
use App\Http\Resources\BulkResultResource;
use App\Models\User;

class UserBulkController extends Controller
{
    public function deactivate(BulkUserRequest $request, BulkDeactivateUsers $deactivate): BulkResultResource
    {
        /** @var User $actor */
        $actor = $request->user();

        return new BulkResultResource($deactivate->handle($actor, $request->ids()));
    }

    public function reactivate(BulkUserRequest $request, BulkReactivateUsers $reactivate): BulkResultResource
    {
        return new BulkResultResource($reactivate->handle($request->ids()));
    }
}
