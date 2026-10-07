<?php

namespace App\Http\Resources;

use App\Models\Invitation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Never exposes the token. The id is only shown to the administrator who created the invitation.
 *
 * @mixin Invitation
 */
class InvitationResource extends JsonResource
{
    public function __construct($resource, private readonly bool $withId = false)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->when($this->withId, $this->id),
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'area' => new AreaResource($this->whenLoaded('area')),
            'expires_at' => $this->expires_at,
        ];
    }
}
