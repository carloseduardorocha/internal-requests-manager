<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Checks profile and visibility only. The status is checked by the Actions (409).
 */
class InternalRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function viewDashboard(User $user): bool
    {
        return in_array($user->role, [Role::Analyst, Role::Admin], true);
    }

    public function view(User $user, InternalRequest $internalRequest): Response
    {
        if ($user->role !== Role::Requester || $internalRequest->requester_id === $user->id) {
            return Response::allow();
        }

        return Response::denyAsNotFound();
    }

    public function create(User $user): bool
    {
        return $user->role !== Role::Analyst;
    }

    public function update(User $user, InternalRequest $internalRequest): Response
    {
        return $this->manage($user, $internalRequest);
    }

    public function delete(User $user, InternalRequest $internalRequest): Response
    {
        return $this->manage($user, $internalRequest);
    }

    public function assign(User $user, InternalRequest $internalRequest): Response
    {
        $visible = $this->view($user, $internalRequest);

        if ($visible->denied()) {
            return $visible;
        }

        return $user->role === Role::Requester ? Response::deny() : Response::allow();
    }

    public function decide(User $user, InternalRequest $internalRequest): Response
    {
        $visible = $this->view($user, $internalRequest);

        if ($visible->denied()) {
            return $visible;
        }

        if ($user->role === Role::Admin
            || ($user->role === Role::Analyst && $internalRequest->assigned_to === $user->id)) {
            return Response::allow();
        }

        return Response::deny();
    }

    private function manage(User $user, InternalRequest $internalRequest): Response
    {
        $visible = $this->view($user, $internalRequest);

        if ($visible->denied()) {
            return $visible;
        }

        if ($user->role === Role::Admin || $internalRequest->requester_id === $user->id) {
            return Response::allow();
        }

        return Response::deny();
    }
}
