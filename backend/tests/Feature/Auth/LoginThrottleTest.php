<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginThrottleTest extends TestCase
{
    use RefreshDatabase;

    private function attempt(string $email, string $password)
    {
        return $this->postJson('/api/login', ['email' => $email, 'password' => $password]);
    }

    private function failTimes(string $email, int $times): void
    {
        for ($i = 0; $i < $times; $i++) {
            $this->attempt($email, 'wrong')->assertUnprocessable();
        }
    }

    public function test_login_is_blocked_after_five_wrong_attempts_even_with_the_right_password(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        $this->failTimes('ana@empresa.com', 5);

        $response = $this->attempt('ana@empresa.com', 'password')->assertStatus(429);

        $this->assertTrue($response->headers->has('Retry-After'));
        $this->assertGreaterThan(0, (int) $response->headers->get('Retry-After'));
        $this->assertLessThanOrEqual(15 * 60, (int) $response->headers->get('Retry-After'));
        $this->assertGuest();
    }

    public function test_login_works_again_after_the_block_expires(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        $this->failTimes('ana@empresa.com', 5);
        $this->attempt('ana@empresa.com', 'password')->assertStatus(429);

        $this->travel(15)->minutes();

        $this->attempt('ana@empresa.com', 'password')->assertOk();
    }

    public function test_block_is_per_email_and_ip(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);
        $other = User::factory()->create(['email' => 'bruno@empresa.com']);

        $this->failTimes('ana@empresa.com', 5);
        $this->attempt('ana@empresa.com', 'password')->assertStatus(429);

        $this->attempt('bruno@empresa.com', 'password')->assertOk();
        $this->assertAuthenticatedAs($other);
    }

    public function test_a_blocked_email_can_still_log_in_from_another_ip(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        $this->failTimes('ana@empresa.com', 5);
        $this->attempt('ana@empresa.com', 'password')->assertStatus(429);

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
            ->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])
            ->assertOk();

        $this->app['auth']->forgetGuards();
        $this->flushSession();
        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1']);
        $this->attempt('ana@empresa.com', 'password')->assertStatus(429);
    }

    public function test_block_is_case_insensitive_on_the_email(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        $this->failTimes('ana@empresa.com', 5);

        $this->attempt('ANA@empresa.com', 'password')->assertStatus(429);
    }

    public function test_a_successful_login_resets_the_attempt_counter(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        $this->failTimes('ana@empresa.com', 4);
        $this->attempt('ana@empresa.com', 'password')->assertOk();
        $this->failTimes('ana@empresa.com', 4);

        $this->attempt('ana@empresa.com', 'password')->assertOk();
    }

    public function test_cors_config_exposes_retry_after_with_credentials(): void
    {
        $this->assertContains('Retry-After', config('cors.exposed_headers'));
        $this->assertTrue(config('cors.supports_credentials'));
    }
}
