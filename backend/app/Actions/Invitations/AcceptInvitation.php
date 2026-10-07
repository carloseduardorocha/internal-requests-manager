<?php

namespace App\Actions\Invitations;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AcceptInvitation
{
    /**
     * Creates the account from the invitation and logs it in.
     *
     * @throws TokenMismatchException
     * @throws NotFoundHttpException
     */
    public function handle(Request $request, string $token, string $password): User
    {
        // The API serves only the SPA, which always has a session (ADR 0004).
        if (! $request->hasSession()) {
            throw new TokenMismatchException;
        }

        $user = DB::transaction(function () use ($token, $password): User {
            $invitation = Invitation::query()
                ->where('token', Invitation::hashToken($token))
                ->lockForUpdate()
                ->first();

            if ($invitation === null
                || $invitation->accepted_at !== null
                || $invitation->expires_at->isPast()
                || User::where('email', $invitation->email)->exists()) {
                throw new NotFoundHttpException(__('invitations.invalid'));
            }

            $user = User::create([
                'name' => $invitation->name,
                'email' => $invitation->email,
                'password' => $password,
                'role' => $invitation->role,
                'area_id' => $invitation->area_id,
            ]);

            $invitation->update(['accepted_at' => now()]);

            return $user;
        });

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return $user;
    }
}
