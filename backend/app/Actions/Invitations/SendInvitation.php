<?php

namespace App\Actions\Invitations;

use App\Enums\Role;
use App\Models\Invitation;
use App\Notifications\InvitationSent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class SendInvitation
{
    /**
     * Creates the invitation, or overwrites the one of the same e-mail so the old link stops working.
     */
    public function handle(string $name, string $email, Role $role, int $areaId): Invitation
    {
        return DB::transaction(function () use ($name, $email, $role, $areaId): Invitation {
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

            Notification::route('mail', $email)->notify(new InvitationSent($invitation, $token));

            return $invitation;
        });
    }
}
