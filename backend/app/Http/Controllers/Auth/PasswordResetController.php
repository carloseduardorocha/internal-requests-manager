<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\ResetPassword;
use App\Actions\Auth\SendPasswordResetLink;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use Illuminate\Http\Response;

class PasswordResetController extends Controller
{
    public function forgot(ForgotPasswordRequest $request, SendPasswordResetLink $sendLink): Response
    {
        $sendLink->handle($request->string('email')->toString());

        return response()->noContent();
    }

    public function reset(ResetPasswordRequest $request, ResetPassword $resetPassword): Response
    {
        $resetPassword->handle(
            $request->string('email')->toString(),
            $request->string('token')->toString(),
            $request->string('password')->toString(),
            $request->boolean('logout_other_devices'),
        );

        return response()->noContent();
    }
}
