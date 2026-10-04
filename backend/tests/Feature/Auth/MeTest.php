<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeTest extends TestCase
{
    use RefreshDatabase;

    public function test_me_without_session_is_unauthorized(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_me_returns_the_current_user_with_role_and_area(): void
    {
        $user = User::factory()->admin()->create();

        $this->actingAs($user)
            ->getJson('/api/me')
            ->assertOk()
            ->assertExactJson(['data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'admin',
                'area' => ['id' => $user->area->id, 'name' => $user->area->name],
            ]]);
    }

    public function test_me_does_not_expose_the_password(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/me')
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.remember_token');
    }
}
