<?php

namespace App\Actions\InternalRequests;

use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class DeleteInternalRequest
{
    /**
     * Soft deletes the request only while it is still open (row locked during the check and the write).
     *
     * @throws ConflictHttpException
     */
    public function handle(InternalRequest $internalRequest, User $user): void
    {
        DB::transaction(function () use ($internalRequest, $user) {
            // Locks the row: the status cannot change between the check and the write.
            $current = InternalRequest::query()
                ->whereKey($internalRequest->getKey())
                ->where('status', InternalRequestStatus::Open)
                ->lockForUpdate()
                ->first();

            if ($current === null) {
                throw new ConflictHttpException(__('internal_requests.not_open'));
            }

            $current->deleted_by = $user->id;
            $current->save();
            $current->delete();
        });
    }
}
