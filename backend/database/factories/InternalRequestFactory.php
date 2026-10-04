<?php

namespace Database\Factories;

use App\Enums\InternalRequestPriority;
use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InternalRequest>
 */
class InternalRequestFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'priority' => fake()->randomElement(InternalRequestPriority::cases()),
            'status' => InternalRequestStatus::Open,
            'requester_id' => User::factory(),
            // Same area as the requester, as the Create action does.
            'area_id' => fn (array $attributes) => User::find($attributes['requester_id'])->area_id,
        ];
    }

    public function inReview(?User $analyst = null): static
    {
        return $this->state(function () use ($analyst) {
            $analyst ??= User::factory()->analyst()->create();

            return [
                'status' => InternalRequestStatus::InReview,
                'assigned_to' => $analyst->id,
                'assigned_at' => now(),
            ];
        });
    }

    public function approved(?User $analyst = null): static
    {
        return $this->decided(InternalRequestStatus::Approved, $analyst);
    }

    public function rejected(?User $analyst = null): static
    {
        return $this->decided(InternalRequestStatus::Rejected, $analyst);
    }

    private function decided(InternalRequestStatus $status, ?User $analyst): static
    {
        return $this->state(function () use ($status, $analyst) {
            $analyst ??= User::factory()->analyst()->create();

            return [
                'status' => $status,
                'assigned_to' => $analyst->id,
                'assigned_at' => now()->subHour(),
                'decided_by' => $analyst->id,
                'decided_at' => now(),
                'decision_justification' => fake()->sentence(),
            ];
        });
    }
}
