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
     * Soft deletes the request only while it is still open (conditional update, safe against races).
     *
     * @throws ConflictHttpException
     */
    public function handle(InternalRequest $internalRequest, User $user): void
    {
        DB::transaction(function () use ($internalRequest, $user) {
            $deleted = InternalRequest::query()
                ->whereKey($internalRequest->getKey())
                ->where('status', InternalRequestStatus::Open)
                ->update(['deleted_at' => now(), 'deleted_by' => $user->id]);

            if ($deleted === 0) {
                throw new ConflictHttpException(__('internal_requests.not_open'));
            }
        });
    }
}
