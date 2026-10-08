<?php

namespace App\Http\Controllers;

use App\Actions\Users\BulkDeactivateUsers;
use App\Actions\Users\BulkReactivateUsers;
use App\Http\Requests\Users\BulkUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserBulkController extends Controller
{
    public function deactivate(BulkUserRequest $request, BulkDeactivateUsers $deactivate): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();

        return response()->json(['data' => $deactivate->handle($actor, $request->ids())->toArray()]);
    }

    public function reactivate(BulkUserRequest $request, BulkReactivateUsers $reactivate): JsonResponse
    {
        return response()->json(['data' => $reactivate->handle($request->ids())->toArray()]);
    }
}
