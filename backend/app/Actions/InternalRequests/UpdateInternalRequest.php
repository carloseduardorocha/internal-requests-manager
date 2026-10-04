<?php

namespace App\Actions\InternalRequests;

use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class UpdateInternalRequest
{
    /**
     * Edits the request only while it is still open (row locked during the check and the write).
     *
     * @param  array<string, mixed>  $attributes
     *
     * @throws ConflictHttpException
     */
    public function handle(InternalRequest $internalRequest, array $attributes): InternalRequest
    {
        return DB::transaction(function () use ($internalRequest, $attributes) {
            // Locks the row: the status cannot change between the check and the write.
            $current = InternalRequest::query()
                ->whereKey($internalRequest->getKey())
                ->where('status', InternalRequestStatus::Open)
                ->lockForUpdate()
                ->first();

            if ($current === null) {
                throw new ConflictHttpException(__('internal_requests.not_open'));
            }

            $current->update($attributes);

            return $current;
        });
    }
}
