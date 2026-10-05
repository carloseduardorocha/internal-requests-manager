<?php

namespace App\Actions\InternalRequests;

use App\Enums\InternalRequestPriority;
use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use App\Models\User;
use App\Notifications\InternalRequestCreated;
use App\Notifications\NotifyTeam;
use Illuminate\Support\Facades\DB;

class CreateInternalRequest
{
    public function __construct(private readonly NotifyTeam $notifyTeam) {}

    /**
     * Creates an open request in the user's current area and records the first history row.
     */
    public function handle(User $user, string $title, string $description, InternalRequestPriority $priority): InternalRequest
    {
        return DB::transaction(function () use ($user, $title, $description, $priority) {
            $internalRequest = InternalRequest::create([
                'title' => $title,
                'description' => $description,
                'priority' => $priority,
                'status' => InternalRequestStatus::Open,
                'requester_id' => $user->id,
                'area_id' => $user->area_id,
            ]);

            $internalRequest->statusChanges()->create([
                'from_status' => null,
                'to_status' => InternalRequestStatus::Open,
                'changed_by' => $user->id,
            ]);

            $this->notifyTeam->handle(new InternalRequestCreated($internalRequest));

            return $internalRequest;
        });
    }
}
