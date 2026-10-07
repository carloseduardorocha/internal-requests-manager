<?php

namespace App\Actions\Invitations;

use App\Enums\Role;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationSent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SendInvitation
{
    /**
     * Creates the invitation, or overwrites the one of the same e-mail so the old link stops working.
     */
    public function handle(string $name, string $email, Role $role, int $areaId): Invitation
    {
        return DB::transaction(function () use ($name, $email, $role, $areaId): Invitation {
            // Locks the existing row, so a re-invite racing an accept cannot reopen a used invitation.
            Invitation::where('email', $email)->lockForUpdate()->first();

            $existing = User::where('email', $email)->first();

            if ($existing !== null) {
                throw ValidationException::withMessages([
                    'email' => $existing->isActive() ? __('invitations.email_taken') : __('invitations.email_deactivated'),
                ]);
            }

            $token = Str::random(64);

            $invitation = Invitation::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'role' => $role,
                    'area_id' => $areaId,
                    'token' => Invitation::hashToken($token),
                    'expires_at' => now()->addDays((int) config('auth.invitations.expire_days')),
                    'accepted_at' => null,
                ],
            );
            $invitation->load('area');

            Notification::route('mail', $email)->notify(new InvitationSent(
                $invitation->name,
                $role->value,
                $invitation->area->name,
                $invitation->expires_at,
                $token,
            ));

            return $invitation;
        });
    }
}
