<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class ManagedUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $actor = $request->user();
        $isSelf = $actor->is($this->resource);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'area' => new AreaResource($this->whenLoaded('area')),
            'status' => $this->status(),
            'deactivated_at' => $this->deactivated_at,
            'created_at' => $this->created_at,
            'can' => [
                'update' => $actor->can('update', $this->resource),
                'change_role' => ! $isSelf && $actor->can('update', $this->resource),
                'deactivate' => $this->isActive() && $actor->can('deactivate', $this->resource),
                'reactivate' => ! $this->isActive() && $actor->can('reactivate', $this->resource),
            ],
        ];
    }
}
