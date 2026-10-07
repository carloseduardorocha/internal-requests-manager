<?php

namespace App\Http\Controllers;

use App\Actions\Invitations\AcceptInvitation;
use App\Actions\Invitations\SendInvitation;
use App\Enums\Role;
use App\Http\Requests\Invitations\AcceptInvitationRequest;
use App\Http\Requests\Invitations\StoreInvitationRequest;
use App\Http\Resources\InvitationResource;
use App\Http\Resources\UserResource;
use App\Models\Invitation;
use Illuminate\Http\JsonResponse;

class InvitationController extends Controller
{
    public function store(StoreInvitationRequest $request, SendInvitation $sendInvitation): JsonResponse
    {
        $invitation = $sendInvitation->handle(
            $request->string('name')->toString(),
            $request->string('email')->toString(),
            Role::from($request->string('role')->toString()),
            $request->integer('area_id'),
        );

        return (new InvitationResource($invitation, withId: true))->response()->setStatusCode(201);
    }

    public function show(string $token): InvitationResource
    {
        $invitation = Invitation::findPendingByToken($token);

        abort_if($invitation === null, 404, __('invitations.invalid'));

        return new InvitationResource($invitation->load('area'));
    }

    public function accept(AcceptInvitationRequest $request, string $token, AcceptInvitation $acceptInvitation): JsonResponse
    {
        $user = $acceptInvitation->handle($request, $token, $request->string('password')->toString());

        return (new UserResource($user->load('area')))->response()->setStatusCode(201);
    }
}
