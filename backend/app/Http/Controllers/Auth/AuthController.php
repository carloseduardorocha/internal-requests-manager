<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\LogIn;
use App\Actions\Auth\LogOut;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    public function login(LoginRequest $request, LogIn $logIn): UserResource
    {
        $logIn->handle(
            $request,
            $request->string('email')->toString(),
            $request->string('password')->toString(),
            $request->boolean('remember'),
        );

        return new UserResource($request->user()->load('area'));
    }

    public function logout(Request $request, LogOut $logOut): Response
    {
        $logOut->handle($request);

        return response()->noContent();
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('area'));
    }
}
