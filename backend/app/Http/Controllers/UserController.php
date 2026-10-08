<?php

namespace App\Http\Controllers;

use App\Actions\Users\DeactivateUser;
use App\Actions\Users\ReactivateUser;
use App\Actions\Users\UpdateUser;
use App\Enums\AccountStatus;
use App\Http\Requests\Users\IndexUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Http\Resources\ManagedUserResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class UserController extends Controller
{
    public function index(IndexUserRequest $request): AnonymousResourceCollection
    {
        $query = User::query()
            ->with('area')
            ->when($request->filled('role'), fn ($q) => $q->where('role', $request->input('role')))
            ->when($request->filled('area_id'), fn ($q) => $q->where('area_id', $request->integer('area_id')))
            ->when($request->filled('status'), fn ($q) => $q->withStatus(AccountStatus::from($request->string('status')->toString())))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.addcslashes($request->string('search')->toString(), '%_\\').'%';

                $q->where(fn ($inner) => $inner->where('name', 'like', $term)->orWhere('email', 'like', $term));
            })
            ->orderBy('name')
            ->orderBy('id');

        return ManagedUserResource::collection(
            $query->paginate($request->integer('per_page') ?: 15)->withQueryString(),
        );
    }

    public function update(UpdateUserRequest $request, User $user, UpdateUser $update): ManagedUserResource
    {
        return new ManagedUserResource($update->handle($user, $request->validated())->load('area'));
    }

    public function deactivate(User $user, DeactivateUser $deactivate): ManagedUserResource
    {
        Gate::authorize('deactivate', $user);

        return new ManagedUserResource($deactivate->handle($user)->load('area'));
    }

    public function reactivate(User $user, ReactivateUser $reactivate): ManagedUserResource
    {
        Gate::authorize('reactivate', $user);

        return new ManagedUserResource($reactivate->handle($user)->load('area'));
    }
}
