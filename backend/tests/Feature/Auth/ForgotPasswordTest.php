<?php

namespace Tests\Feature\Auth;

use App\Jobs\SendPasswordResetLink;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ForgotPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_existing_and_unknown_emails_get_the_same_empty_response(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'ana@empresa.com']);

        $known = $this->postJson('/api/forgot-password', ['email' => 'ana@empresa.com'])->assertNoContent();
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'nobody@empresa.com'])->assertNoContent();

        $this->assertSame($known->getContent(), $unknown->getContent());
        $this->assertSame($known->headers->get('Content-Type'), $unknown->headers->get('Content-Type'));
    }

    public function test_the_link_is_sent_only_to_the_account_that_exists(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'ana@empresa.com']);
        $other = User::factory()->create();

        $this->postJson('/api/forgot-password', ['email' => 'ana@empresa.com'])->assertNoContent();
        $this->postJson('/api/forgot-password', ['email' => 'nobody@empresa.com'])->assertNoContent();

        Notification::assertSentToTimes($user, ResetPasswordNotification::class, 1);
        Notification::assertNotSentTo($other, ResetPasswordNotification::class);
        Notification::assertSentTimes(ResetPasswordNotification::class, 1);
        $this->assertDatabaseCount('password_reset_tokens', 1);
    }

    public function test_a_repeated_request_within_60_seconds_still_answers_the_same(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'ana@empresa.com']);

        $first = $this->postJson('/api/forgot-password', ['email' => 'ana@empresa.com'])->assertNoContent();
        $second = $this->postJson('/api/forgot-password', ['email' => 'ana@empresa.com'])->assertNoContent();

        $this->assertSame($first->getContent(), $second->getContent());
        Notification::assertSentToTimes($user, ResetPasswordNotification::class, 1);
    }

    public function test_the_token_is_stored_hashed(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertNoContent();

        $token = null;
        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });
        $stored = DB::table('password_reset_tokens')->where('email', $user->email)->value('token');
        $this->assertNotSame($token, $stored);
    }

    public function test_email_is_required_and_must_be_valid(): void
    {
        $this->postJson('/api/forgot-password', [])->assertUnprocessable()->assertJsonValidationErrors(['email']);
        $this->postJson('/api/forgot-password', ['email' => 'not-an-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_the_seventh_request_from_the_same_ip_in_a_minute_is_throttled(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'ana@empresa.com']);

        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/forgot-password', ['email' => "nobody{$i}@empresa.com"])->assertNoContent();
        }

        $this->postJson('/api/forgot-password', ['email' => 'ana@empresa.com'])->assertStatus(429);
        $this->postJson('/api/forgot-password', ['email' => 'nobody@empresa.com'])->assertStatus(429);
        Notification::assertNothingSentTo($user);
    }

    public function test_sending_the_mail_is_queued_so_it_does_not_delay_the_response(): void
    {
        Queue::fake();
        User::factory()->create(['email' => 'ana@empresa.com']);

        $known = $this->postJson('/api/forgot-password', ['email' => 'ana@empresa.com']);
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'nobody@empresa.com']);

        $known->assertNoContent();
        $unknown->assertNoContent();
        $this->assertSame($known->getContent(), $unknown->getContent());
        Queue::assertPushed(SendPasswordResetLink::class, 2);
        Queue::assertPushed(SendPasswordResetLink::class, fn ($job) => $job->email === 'ana@empresa.com');
        Queue::assertPushed(SendPasswordResetLink::class, fn ($job) => $job->email === 'nobody@empresa.com');
        Queue::assertNotPushed(SendQueuedNotifications::class);
    }

    public function test_the_queued_job_sends_the_reset_notification_through_the_broker(): void
    {
        Queue::fake();
        User::factory()->create(['email' => 'ana@empresa.com']);

        (new SendPasswordResetLink('ana@empresa.com'))->handle();

        Queue::assertPushed(
            SendQueuedNotifications::class,
            fn ($job) => $job->notification instanceof ResetPasswordNotification,
        );
    }
}
