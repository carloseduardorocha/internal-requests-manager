<?php

namespace Tests\Feature\Notifications;

use App\Models\Area;
use App\Models\InternalRequest;
use App\Models\NotificationLog;
use App\Models\User;
use App\Notifications\InternalRequestAssumed;
use App\Notifications\InternalRequestDecided;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Tests\TestCase;

class MailNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_assuming_notifies_only_the_requester_by_mail(): void
    {
        Notification::fake();
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->create();

        $this->actingAs($analyst)->postJson("/api/internal-requests/{$request->id}/assign")->assertOk();

        Notification::assertSentTo($request->requester, InternalRequestAssumed::class);
        Notification::assertSentTimes(InternalRequestAssumed::class, 1);
        Notification::assertNotSentTo($analyst, InternalRequestAssumed::class);
        Notification::assertSentTimes(InternalRequestDecided::class, 0);
    }

    public function test_deciding_notifies_the_requester_and_the_team_channel(): void
    {
        Notification::fake();
        config(['services.discord.webhook_url' => 'https://discord.test/hook']);
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();

        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$request->id}/approve", ['justification' => 'Dentro do orçamento.'])
            ->assertOk();

        Notification::assertSentTo($request->requester, InternalRequestDecided::class);
        Notification::assertSentOnDemand(
            InternalRequestDecided::class,
            fn ($notification, $channels, AnonymousNotifiable $notifiable) => $channels === ['discord']
                && $notifiable->routes['discord'] === 'https://discord.test/hook',
        );
        Notification::assertSentTimes(InternalRequestDecided::class, 2);
        Notification::assertSentTimes(InternalRequestAssumed::class, 0);
    }

    public function test_creating_does_not_send_mail(): void
    {
        Notification::fake();
        config(['services.discord.webhook_url' => 'https://discord.test/hook']);
        $requester = User::factory()->create();

        $this->actingAs($requester)->postJson('/api/internal-requests', [
            'title' => 'Novo notebook',
            'description' => 'Preciso de um notebook novo para o trabalho.',
            'priority' => 'medium',
            'area_id' => Area::factory()->create()->id,
        ])->assertCreated();

        Notification::assertNothingSentTo($requester);
    }

    public function test_invalid_transitions_answer_409_and_send_nothing(): void
    {
        Notification::fake();
        $analyst = User::factory()->analyst()->create();
        $inReview = InternalRequest::factory()->inReview($analyst)->create();
        $open = InternalRequest::factory()->create();

        $this->actingAs($analyst)->postJson("/api/internal-requests/{$inReview->id}/assign")->assertStatus(409);
        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/internal-requests/{$open->id}/approve", ['justification' => 'Dentro do orçamento.'])
            ->assertStatus(409);

        Notification::assertNothingSent();
    }

    public function test_assumed_mail_reaches_the_requester_address_and_is_logged(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->create();

        $this->actingAs($analyst)->postJson("/api/internal-requests/{$request->id}/assign")->assertOk();

        $messages = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $messages);
        $email = $messages[0]->getOriginalMessage();
        $this->assertSame($request->requester->email, $email->getTo()[0]->getAddress());
        $this->assertSame("Seu pedido #{$request->id} está em análise", $email->getSubject());
        $this->assertStringContainsString("/requests/{$request->id}", $email->getHtmlBody());

        $log = NotificationLog::query()->where('internal_request_id', $request->id)->sole();
        $this->assertSame('mail', $log->channel->value);
        $this->assertSame('assigned', $log->event->value);
        $this->assertSame(1, $log->attempt);
        $this->assertSame('sent', $log->status->value);
    }

    public function test_decided_mail_is_sent_with_subject_and_justification(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();

        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$request->id}/reject", ['justification' => 'Fora da política.'])
            ->assertOk();

        $messages = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $messages);
        $email = $messages[0]->getOriginalMessage();
        $this->assertSame($request->requester->email, $email->getTo()[0]->getAddress());
        $this->assertSame("Seu pedido #{$request->id} foi rejeitado", $email->getSubject());
        $this->assertStringContainsString('Fora da política.', $email->getHtmlBody());
        $this->assertDatabaseHas('notification_logs', [
            'internal_request_id' => $request->id, 'channel' => 'mail', 'event' => 'decided', 'attempt' => 1, 'status' => 'sent',
        ]);
    }

    public function test_mail_failure_does_not_affect_the_operation_and_is_retried_and_logged(): void
    {
        Mail::extend('failing', fn () => new class extends AbstractTransport
        {
            protected function doSend(SentMessage $message): void
            {
                throw new \RuntimeException('SMTP down');
            }

            public function __toString(): string
            {
                return 'failing';
            }
        });
        config([
            'mail.default' => 'failing',
            'mail.mailers.failing' => ['transport' => 'failing'],
            'queue.default' => 'database',
        ]);

        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->create();

        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$request->id}/assign")
            ->assertOk()
            ->assertJsonPath('data.status', 'in_review');

        $this->assertSame('in_review', $request->fresh()->status->value);
        $this->assertSame(1, DB::table('jobs')->count());

        for ($i = 0; $i < 4; $i++) {
            // The backoff delays each retry; make it available now instead of waiting.
            DB::table('jobs')->update(['available_at' => now()->subSecond()->timestamp]);
            Artisan::call('queue:work', ['--stop-when-empty' => true, '--sleep' => 0]);
        }

        $this->assertSame('in_review', $request->fresh()->status->value);
        $this->assertSame(4, NotificationLog::query()->where('channel', 'mail')->where('status', 'failed')->count());
        $this->assertSame([1, 2, 3, 4], NotificationLog::query()->orderBy('attempt')->pluck('attempt')->all());
        $this->assertSame(1, DB::table('failed_jobs')->count());
        $this->assertSame(0, DB::table('jobs')->count());
    }
}
