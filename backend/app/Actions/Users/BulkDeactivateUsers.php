<?php

namespace App\Actions\Users;

use App\Actions\BulkResult;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class BulkDeactivateUsers
{
    public function __construct(private readonly DeactivateUser $deactivate) {}

    /**
     * Each account has its own transaction, so a skipped one never blocks the others.
     *
     * @param  list<int>  $ids
     */
    public function handle(User $actor, array $ids): BulkResult
    {
        $done = [];
        $skipped = [];

        foreach ($ids as $id) {
            // Read the status under lock, so an account changed by another request is not counted as done.
            $reason = DB::transaction(function () use ($actor, $id): ?string {
                $user = User::query()->whereKey($id)->lockForUpdate()->first();

                if ($user === null) {
                    return 'not_found';
                }

                if ($actor->is($user)) {
                    return 'self';
                }

                if ($user->deactivated_at !== null) {
                    return 'already_deactivated';
                }

                $this->deactivate->handle($user);

                return null;
            });

            if ($reason === null) {
                $done[] = $id;

                continue;
            }

            $skipped[] = [
                'id' => $id,
                'reason' => $reason,
                'message' => $reason === 'self' ? __('users.cannot_deactivate_self') : __('users.bulk.'.$reason),
            ];
        }

        return new BulkResult($done, $skipped);
    }
}
