<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class BulkReactivateUsers
{
    public function __construct(private readonly ReactivateUser $reactivate) {}

    /**
     * Each account has its own transaction, so a skipped one never blocks the others.
     *
     * @param  list<int>  $ids
     */
    public function handle(array $ids): BulkResult
    {
        $done = [];
        $skipped = [];

        foreach ($ids as $id) {
            // Read the status under lock, so an account changed by another request is not counted as done.
            $reason = DB::transaction(function () use ($id): ?string {
                $user = User::query()->whereKey($id)->lockForUpdate()->first();

                if ($user === null) {
                    return 'not_found';
                }

                if ($user->deactivated_at === null) {
                    return 'already_active';
                }

                $this->reactivate->handle($user);

                return null;
            });

            if ($reason === null) {
                $done[] = $id;

                continue;
            }

            $skipped[] = ['id' => $id, 'reason' => $reason, 'message' => __('users.bulk.'.$reason)];
        }

        return new BulkResult($done, $skipped);
    }
}
