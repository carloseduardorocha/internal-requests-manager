<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\Area;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => Role::Requester,
            'area_id' => Area::factory(),
            'remember_token' => Str::random(10),
        ];
    }

    public function analyst(): static
    {
        return $this->state(fn (array $attributes) => ['role' => Role::Analyst]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => Role::Admin]);
    }

    public function deactivated(): static
    {
        return $this->state(fn (array $attributes) => ['deactivated_at' => now()]);
    }
}
