<?php

namespace App\Actions\InternalRequests;

use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use App\Models\User;
use App\Notifications\InternalRequestAssumed;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class AssumeInternalRequest
{
    /**
     * Moves an open request to review and records who took it (row locked during the check and the write).
     *
     * @throws ConflictHttpException
     */
    public function handle(InternalRequest $internalRequest, User $user): InternalRequest
    {
        return DB::transaction(function () use ($internalRequest, $user) {
            // Locks the row: the status cannot change between the check and the write.
            $current = InternalRequest::query()
                ->whereKey($internalRequest->getKey())
                ->lockForUpdate()
                ->first();

            if ($current === null || ! $current->status->canTransitionTo(InternalRequestStatus::InReview)) {
                throw new ConflictHttpException(__('internal_requests.not_open_to_assign'));
            }

            $now = now();
            $from = $current->status;

            $current->forceFill([
                'status' => InternalRequestStatus::InReview,
                'assigned_to' => $user->id,
                'assigned_at' => $now,
            ])->save();

            $change = $current->statusChanges()->make([
                'from_status' => $from,
                'to_status' => InternalRequestStatus::InReview,
                'changed_by' => $user->id,
            ]);
            $change->created_at = $now;
            $change->save();

            $current->requester->notify(new InternalRequestAssumed($current));

            return $current;
        });
    }
}
