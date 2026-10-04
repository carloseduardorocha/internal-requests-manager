<?php

namespace App\Actions\InternalRequests;

use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class UpdateInternalRequest
{
    /**
     * Edits the request only while it is still open (conditional update, safe against races).
     *
     * @param  array<string, mixed>  $attributes
     *
     * @throws ConflictHttpException
     */
    public function handle(InternalRequest $internalRequest, array $attributes): InternalRequest
    {
        return DB::transaction(function () use ($internalRequest, $attributes) {
            $updated = InternalRequest::query()
                ->whereKey($internalRequest->getKey())
                ->where('status', InternalRequestStatus::Open)
                ->update($attributes + ['updated_at' => now()]);

            if ($updated === 0) {
                throw new ConflictHttpException(__('internal_requests.not_open'));
            }

            return $internalRequest->refresh();
        });
    }
}
