<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_credentials_return_the_user_and_start_a_session(): void
    {
        $user = User::factory()->analyst()->create(['email' => 'ana@empresa.com']);

        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])
            ->assertOk()
            ->assertExactJson(['data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => 'ana@empresa.com',
                'role' => 'analyst',
                'area' => ['id' => $user->area->id, 'name' => $user->area->name],
            ]]);

        $this->assertAuthenticatedAs($user);

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', 'ana@empresa.com');
    }

    public function test_wrong_password_and_unknown_email_return_the_same_generic_message(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        $wrongPassword = $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'wrong'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $unknownEmail = $this->postJson('/api/login', ['email' => 'nobody@empresa.com', 'password' => 'password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $this->assertSame(__('auth.failed'), $wrongPassword->json('errors.email.0'));
        $this->assertSame($wrongPassword->json('errors.email'), $unknownEmail->json('errors.email'));
        $this->assertGuest();
    }

    public function test_missing_email_or_password_fails_validation(): void
    {
        $this->postJson('/api/login', ['password' => 'password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $this->postJson('/api/login', ['email' => 'ana@empresa.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->postJson('/api/login', ['email' => 'not-an-email', 'password' => 'password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_remember_me_sets_the_remember_cookie(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        $response = $this->postJson('/api/login', [
            'email' => 'ana@empresa.com',
            'password' => 'password',
            'remember' => true,
        ])->assertOk();

        $this->assertNotEmpty($this->rememberCookies($response));
    }

    public function test_remember_cookie_lasts_about_thirty_days(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        $response = $this->postJson('/api/login', [
            'email' => 'ana@empresa.com',
            'password' => 'password',
            'remember' => true,
        ])->assertOk();

        $cookie = collect($response->headers->getCookies())
            ->first(fn ($c) => str_starts_with($c->getName(), 'remember_web_'));

        $this->assertNotNull($cookie);
        $expected = now()->addMinutes(43200)->getTimestamp();
        $this->assertEqualsWithDelta($expected, $cookie->getExpiresTime(), 5 * 60);
    }

    public function test_login_without_remember_does_not_set_the_remember_cookie(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        $response = $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])
            ->assertOk();

        $this->assertEmpty($this->rememberCookies($response));
    }

    /**
     * @return array<int, string>
     */
    private function rememberCookies($response): array
    {
        return collect($response->headers->getCookies())
            ->map(fn ($cookie) => $cookie->getName())
            ->filter(fn ($name) => str_starts_with($name, 'remember_web_'))
            ->values()
            ->all();
    }

    public function test_login_without_a_session_returns_419_and_stays_logged_out(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        $this->withoutHeader('Referer')
            ->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])
            ->assertStatus(419);

        $this->assertGuest();
    }
}
