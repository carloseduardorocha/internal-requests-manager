<?php

namespace App\Http\Resources;

use App\Models\InternalRequestStatusChange;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin InternalRequestStatusChange
 */
class InternalRequestStatusChangeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'from_status' => $this->from_status,
            'to_status' => $this->to_status,
            'changed_by' => new UserSummaryResource($this->whenLoaded('changedBy')),
            'created_at' => $this->created_at,
        ];
    }
}
