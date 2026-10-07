<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\Area;
use App\Models\Invitation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Invitation>
 */
class InvitationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'role' => Role::Requester,
            'area_id' => Area::factory(),
            'token' => Invitation::hashToken(Str::random(64)),
            'expires_at' => now()->addDays(7),
            'accepted_at' => null,
        ];
    }

    public function expired(): static
    {
        return $this->state(['expires_at' => now()->subMinute()]);
    }

    public function accepted(): static
    {
        return $this->state(['accepted_at' => now()]);
    }

    /**
     * Stores the hash of the given plain token, which is what the link carries.
     */
    public function withToken(string $token): static
    {
        return $this->state(['token' => Invitation::hashToken($token)]);
    }

    /**
     * Creates the invitation and returns it with its plain token.
     *
     * @param  array<string, mixed>  $attributes
     * @return array{0: Invitation, 1: string}
     */
    public function createWithToken(array $attributes = []): array
    {
        $token = Str::random(64);

        return [$this->withToken($token)->create($attributes), $token];
    }
}
