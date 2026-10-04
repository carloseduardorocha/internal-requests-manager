<?php

namespace Database\Factories;

use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use App\Models\InternalRequestStatusChange;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InternalRequestStatusChange>
 */
class InternalRequestStatusChangeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'internal_request_id' => InternalRequest::factory(),
            'from_status' => null,
            'to_status' => InternalRequestStatus::Open,
            'changed_by' => User::factory(),
        ];
    }
}
