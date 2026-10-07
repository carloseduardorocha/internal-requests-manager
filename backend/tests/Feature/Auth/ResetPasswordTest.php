<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class ResetPasswordTest extends TestCase
{
    use RefreshDatabase;

    private const NEW_PASSWORD = 'nova-senha-123';

    private function token(User $user): string
    {
        return Password::broker()->createToken($user);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function reset(User $user, string $token, array $overrides = [])
    {
        return $this->postJson('/api/reset-password', array_merge([
            'token' => $token,
            'email' => $user->email,
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ], $overrides));
    }

    private function assertInvalidLink($response): void
    {
        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['token'])
            ->assertJsonPath('errors.token.0', 'Este link de recuperação é inválido ou expirou. Peça um novo.');
    }

    public function test_a_valid_token_sets_the_new_password_without_starting_a_session(): void
    {
        $user = User::factory()->create(['email' => 'ana@empresa.com']);

        $this->reset($user, $this->token($user))->assertNoContent();

        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $user->fresh()->password));
        $this->assertGuest();
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_after_the_reset_the_person_logs_in_with_the_new_password_only(): void
    {
        $user = User::factory()->create(['email' => 'ana@empresa.com']);

        $this->reset($user, $this->token($user))->assertNoContent();

        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])
            ->assertUnprocessable();
        $this->assertGuest();

        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => self::NEW_PASSWORD])
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
        $this->assertAuthenticatedAs($user);
    }

    public function test_the_token_from_the_sent_mail_works_end_to_end(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'ana@empresa.com']);

        $this->postJson('/api/forgot-password', ['email' => 'ana@empresa.com'])->assertNoContent();

        $token = null;
        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });

        $this->reset($user, (string) $token)->assertNoContent();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $user->fresh()->password));
    }

    public function test_the_token_can_be_used_only_once(): void
    {
        $user = User::factory()->create();
        $token = $this->token($user);

        $this->reset($user, $token)->assertNoContent();
        $this->assertInvalidLink($this->reset($user, $token, [
            'password' => 'outra-senha-456',
            'password_confirmation' => 'outra-senha-456',
        ]));

        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_the_token_expires_after_60_minutes(): void
    {
        $user = User::factory()->create();
        $token = $this->token($user);

        $this->travel(61)->minutes();

        $this->assertInvalidLink($this->reset($user, $token));
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_the_token_still_works_just_before_60_minutes(): void
    {
        $user = User::factory()->create();
        $token = $this->token($user);

        $this->travel(59)->minutes();

        $this->reset($user, $token)->assertNoContent();
    }

    public function test_a_new_token_invalidates_the_previous_one(): void
    {
        $user = User::factory()->create();
        $old = $this->token($user);
        $new = $this->token($user);

        $this->assertInvalidLink($this->reset($user, $old));
        $this->reset($user, $new)->assertNoContent();
    }

    public function test_wrong_token_and_unknown_email_fail_with_the_same_message(): void
    {
        $user = User::factory()->create();
        $token = $this->token($user);

        $wrongToken = $this->reset($user, 'not-the-token');
        $unknownEmail = $this->reset($user, $token, ['email' => 'nobody@empresa.com']);

        $this->assertInvalidLink($wrongToken);
        $this->assertInvalidLink($unknownEmail);
        $this->assertSame($wrongToken->json('errors'), $unknownEmail->json('errors'));
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_a_token_of_one_account_does_not_reset_another(): void
    {
        $ana = User::factory()->create();
        $bia = User::factory()->create();

        $this->assertInvalidLink($this->reset($bia, $this->token($ana)));

        $this->assertTrue(Hash::check('password', $bia->fresh()->password));
        $this->assertTrue(Hash::check('password', $ana->fresh()->password));
    }

    public function test_the_password_needs_at_least_8_characters(): void
    {
        $user = User::factory()->create();
        $token = $this->token($user);

        $this->reset($user, $token, ['password' => '1234567', 'password_confirmation' => '1234567'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
        $this->reset($user, $token, ['password' => '12345678', 'password_confirmation' => '12345678'])
            ->assertNoContent();
    }

    public function test_the_password_needs_a_matching_confirmation(): void
    {
        $user = User::factory()->create();
        $token = $this->token($user);

        $this->reset($user, $token, ['password_confirmation' => 'diferente-123'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
        $this->reset($user, $token, ['password_confirmation' => null])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_token_email_and_password_are_required(): void
    {
        $this->postJson('/api/reset-password', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['token', 'email', 'password']);
    }

    public function test_logging_out_other_devices_deletes_only_the_persons_sessions_and_rotates_the_remember_token(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $oldRememberToken = $user->remember_token;
        $otherRememberToken = $other->remember_token;
        $this->insertSession('ana-1', $user->id);
        $this->insertSession('ana-2', $user->id);
        $this->insertSession('bia-1', $other->id);
        $this->insertSession('guest-1', null);

        $this->reset($user, $this->token($user), ['logout_other_devices' => true])->assertNoContent();

        $this->assertDatabaseMissing('sessions', ['id' => 'ana-1']);
        $this->assertDatabaseMissing('sessions', ['id' => 'ana-2']);
        $this->assertDatabaseHas('sessions', ['id' => 'bia-1']);
        $this->assertDatabaseHas('sessions', ['id' => 'guest-1']);
        $this->assertNotSame($oldRememberToken, $user->fresh()->remember_token);
        $this->assertSame($otherRememberToken, $other->fresh()->remember_token);
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $user->fresh()->password));
    }

    public function test_without_the_option_or_with_false_the_sessions_stay(): void
    {
        $user = User::factory()->create();
        $rememberToken = $user->remember_token;
        $this->insertSession('ana-1', $user->id);

        $this->reset($user, $this->token($user))->assertNoContent();
        $this->reset($user, $this->token($user), ['logout_other_devices' => false])->assertNoContent();

        $this->assertDatabaseHas('sessions', ['id' => 'ana-1']);
        $this->assertSame($rememberToken, $user->fresh()->remember_token);
    }

    public function test_logout_other_devices_must_be_a_boolean(): void
    {
        $user = User::factory()->create();

        $this->reset($user, $this->token($user), ['logout_other_devices' => 'maybe'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['logout_other_devices']);
    }

    public function test_a_failed_reset_keeps_the_sessions(): void
    {
        $user = User::factory()->create();
        $this->insertSession('ana-1', $user->id);

        $this->assertInvalidLink($this->reset($user, 'wrong', ['logout_other_devices' => true]));

        $this->assertDatabaseHas('sessions', ['id' => 'ana-1']);
    }

    private function insertSession(string $id, ?int $userId): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $userId,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => '',
            'last_activity' => time(),
        ]);
    }
}
