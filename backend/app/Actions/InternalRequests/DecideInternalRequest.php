<?php

namespace App\Actions\InternalRequests;

use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class DecideInternalRequest
{
    /**
     * Approves or rejects a request under review, with a justification (row locked during the check and the write).
     *
     * @throws ConflictHttpException
     * @throws InvalidArgumentException
     */
    public function handle(
        InternalRequest $internalRequest,
        User $user,
        InternalRequestStatus $decision,
        string $justification,
    ): InternalRequest {
        if ($decision !== InternalRequestStatus::Approved && $decision !== InternalRequestStatus::Rejected) {
            throw new InvalidArgumentException('The decision must be approved or rejected.');
        }

        return DB::transaction(function () use ($internalRequest, $user, $decision, $justification) {
            // Locks the row: the status cannot change between the check and the write.
            $current = InternalRequest::query()
                ->whereKey($internalRequest->getKey())
                ->lockForUpdate()
                ->first();

            if ($current === null || ! $current->status->canTransitionTo($decision)) {
                throw new ConflictHttpException(__('internal_requests.not_in_review'));
            }

            $now = now();
            $from = $current->status;

            $current->forceFill([
                'status' => $decision,
                'decided_by' => $user->id,
                'decided_at' => $now,
                'decision_justification' => $justification,
            ])->save();

            $change = $current->statusChanges()->make([
                'from_status' => $from,
                'to_status' => $decision,
                'changed_by' => $user->id,
            ]);
            $change->created_at = $now;
            $change->save();

            return $current;
        });
    }
}
