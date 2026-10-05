<?php

namespace App\Http\Resources;

use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin InternalRequest
 */
class InternalRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'priority' => $this->priority,
            'status' => $this->status,
            'requester' => new UserSummaryResource($this->whenLoaded('requester')),
            'area' => new AreaResource($this->whenLoaded('area')),
            'assigned_to' => new UserSummaryResource($this->whenLoaded('assignedTo')),
            'assigned_at' => $this->assigned_at,
            'decision' => $this->decided_at === null ? null : [
                'decided_by' => new UserSummaryResource($this->whenLoaded('decidedBy')),
                'decided_at' => $this->decided_at,
                'justification' => $this->decision_justification,
            ],
            'history' => InternalRequestStatusChangeResource::collection($this->whenLoaded('statusChanges')),
            'created_at' => $this->created_at,
            'can' => [
                'update' => $this->isOpen() && $user->can('update', $this->resource),
                'delete' => $this->isOpen() && $user->can('delete', $this->resource),
                'assign' => $this->status->canTransitionTo(InternalRequestStatus::InReview) && $user->can('assign', $this->resource),
                'approve' => $this->status->canTransitionTo(InternalRequestStatus::Approved) && $user->can('decide', $this->resource),
                'reject' => $this->status->canTransitionTo(InternalRequestStatus::Rejected) && $user->can('decide', $this->resource),
            ],
        ];
    }
}
