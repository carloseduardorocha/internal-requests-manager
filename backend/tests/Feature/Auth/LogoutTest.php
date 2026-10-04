<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LogoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_logout_invalidates_the_session_and_rotates_the_remember_token(): void
    {
        $user = User::factory()->create(['email' => 'ana@empresa.com']);
        $oldToken = $user->remember_token;

        $this->postJson('/api/login', [
            'email' => 'ana@empresa.com',
            'password' => 'password',
            'remember' => true,
        ])->assertOk();
        $this->getJson('/api/me')->assertOk();

        $this->postJson('/api/logout')->assertNoContent();

        $this->assertGuest('web');
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/me')->assertUnauthorized();

        $this->assertNotSame($oldToken, $user->fresh()->remember_token);
    }

    public function test_logout_without_session_is_unauthorized(): void
    {
        $this->postJson('/api/logout')->assertUnauthorized();
    }
}
