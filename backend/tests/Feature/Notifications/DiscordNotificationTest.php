<?php

namespace Tests\Feature\Notifications;

use App\Actions\InternalRequests\CreateInternalRequest;
use App\Enums\InternalRequestPriority;
use App\Models\Area;
use App\Models\InternalRequest;
use App\Models\User;
use App\Notifications\InternalRequestCreated;
use App\Notifications\InternalRequestDecided;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class DiscordNotificationTest extends TestCase
{
    use RefreshDatabase;

    private const WEBHOOK = 'https://discord.test/api/webhooks/1/token';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.discord.webhook_url' => self::WEBHOOK, 'app.frontend_url' => 'http://front.test']);
    }

    /**
     * @return array<string, string>
     */
    private function payload(): array
    {
        return ['title' => 'Notebook novo', 'description' => 'Substituir o atual', 'priority' => 'high'];
    }

    private function decide(InternalRequest $request, User $analyst, string $action, string $justification = 'Dentro do orçamento'): void
    {
        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$request->id}/{$action}", ['justification' => $justification])
            ->assertOk();
    }

    public function test_creating_sends_created_on_demand_to_the_discord_route(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $id = $this->actingAs($user)->postJson('/api/internal-requests', $this->payload())
            ->assertCreated()->json('data.id');

        Notification::assertSentOnDemand(
            InternalRequestCreated::class,
            function ($notification, $channels, AnonymousNotifiable $notifiable) use ($id) {
                return $notification->internalRequest->id === $id
                    && $channels === ['discord']
                    && $notifiable->routes['discord'] === 'team';
            },
        );
        Notification::assertSentOnDemandTimes(InternalRequestCreated::class, 1);
        Notification::assertNotSentTo(new AnonymousNotifiable, InternalRequestDecided::class);
    }

    public function test_deciding_sends_decided_on_demand(): void
    {
        foreach (['approve', 'reject'] as $action) {
            Notification::fake();
            $analyst = User::factory()->analyst()->create();
            $request = InternalRequest::factory()->inReview($analyst)->create();

            $this->decide($request, $analyst, $action);

            Notification::assertSentOnDemand(
                InternalRequestDecided::class,
                fn ($notification, $channels, $notifiable) => $notification->internalRequest->id === $request->id
                    && $notifiable->routes['discord'] === 'team',
            );
            Notification::assertSentOnDemandTimes(InternalRequestDecided::class, 1);
            Notification::assertSentOnDemandTimes(InternalRequestCreated::class, 0);
        }
    }

    public function test_assume_edit_and_delete_send_nothing(): void
    {
        Notification::fake();
        $owner = User::factory()->create();
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->create(['requester_id' => $owner->id]);

        $this->actingAs($analyst)->postJson("/api/internal-requests/{$request->id}/assign")->assertOk();
        $this->assertNothingSentToTheTeam();

        $open = InternalRequest::factory()->create(['requester_id' => $owner->id]);
        $this->actingAs($owner)->patchJson("/api/internal-requests/{$open->id}", ['title' => 'Outro título'])->assertOk();
        $this->assertNothingSentToTheTeam();

        $this->actingAs($owner)->deleteJson("/api/internal-requests/{$open->id}")->assertSuccessful();
        $this->assertNothingSentToTheTeam();
    }

    public function test_without_webhook_nothing_is_sent_queued_or_logged(): void
    {
        foreach ([null, ''] as $empty) {
            config(['services.discord.webhook_url' => $empty]);
            Notification::fake();

            $this->actingAs(User::factory()->create())->postJson('/api/internal-requests', $this->payload())->assertCreated();

            $analyst = User::factory()->analyst()->create();
            $request = InternalRequest::factory()->inReview($analyst)->create();
            $this->decide($request, $analyst, 'approve');

            $this->assertNothingSentToTheTeam();
        }

        // Real queue and logging path, without fake.
        config(['queue.default' => 'database', 'services.discord.webhook_url' => null]);
        Http::fake();
        Notification::swap(app(ChannelManager::class));
        $this->actingAs(User::factory()->create())->postJson('/api/internal-requests', $this->payload())->assertCreated();

        $this->assertSame(0, DB::table('jobs')->count());
        $this->assertSame(0, DB::table('notification_logs')->count());
        Http::assertNothingSent();
    }

    public function test_response_does_not_wait_for_the_send(): void
    {
        config(['queue.default' => 'database']);
        Http::fake();

        $this->actingAs(User::factory()->create())->postJson('/api/internal-requests', $this->payload())->assertCreated();

        Http::assertNothingSent();
        $this->assertSame(1, DB::table('jobs')->count());
        $this->assertSame(0, DB::table('notification_logs')->count());
    }

    public function test_decision_response_does_not_wait_for_the_send(): void
    {
        config(['queue.default' => 'database']);
        Http::fake();
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();

        $this->decide($request, $analyst, 'reject');

        Http::assertNothingSent();
        // One job for the Discord channel and one for the requester's email.
        $this->assertSame(2, DB::table('jobs')->count());
    }

    public function test_rolled_back_transaction_queues_nothing(): void
    {
        config(['queue.default' => 'database']);
        Http::fake();
        $user = User::factory()->create();

        try {
            DB::transaction(function () use ($user) {
                app(CreateInternalRequest::class)->handle($user, 'Título', 'Descrição', InternalRequestPriority::High);

                throw new \RuntimeException('rollback');
            });
        } catch (\RuntimeException) {
        }

        $this->assertSame(0, DB::table('jobs')->count());
        $this->assertSame(0, DB::table('notification_logs')->count());
        $this->assertSame(0, InternalRequest::where('title', 'Título')->count());
    }

    public function test_created_message_content_and_success_log(): void
    {
        Http::fake();
        $area = Area::factory()->create(['name' => 'Financeiro']);
        $user = User::factory()->create(['name' => 'Maria Souza', 'area_id' => $area->id]);

        $id = $this->actingAs($user)->postJson('/api/internal-requests', $this->payload())->assertCreated()->json('data.id');

        Http::assertSent(function (Request $request) use ($id) {
            $embed = $request->data()['embeds'][0];
            $fields = collect($embed['fields'])->pluck('value', 'name');

            return $request->url() === self::WEBHOOK
                && $embed['title'] === "Novo pedido #{$id}"
                && $embed['description'] === 'Notebook novo'
                && $embed['url'] === "http://front.test/requests/{$id}"
                && $fields['Prioridade'] === 'Alta'
                && $fields['Solicitante'] === 'Maria Souza'
                && $fields['Área'] === 'Financeiro';
        });

        $this->assertDatabaseCount('notification_logs', 1);
        $this->assertDatabaseHas('notification_logs', [
            'internal_request_id' => $id,
            'channel' => 'discord',
            'event' => 'created',
            'attempt' => 1,
            'status' => 'sent',
            'error' => null,
        ]);
    }

    public function test_decided_message_content_and_log(): void
    {
        Http::fake();
        $analyst = User::factory()->analyst()->create(['name' => 'Ana Analista']);

        foreach (['approve' => ['aprovado', 'Aprovado', 'approved'], 'reject' => ['rejeitado', 'Rejeitado', 'rejected']] as $action => [$word, $result, $status]) {
            $request = InternalRequest::factory()->inReview($analyst)->create(['priority' => 'low']);

            $this->decide($request, $analyst, $action, 'Motivo da decisão');

            Http::assertSent(function (Request $http) use ($request, $word, $result) {
                $embed = $http->data()['embeds'][0];
                $fields = collect($embed['fields'])->pluck('value', 'name');

                return $http->url() === self::WEBHOOK
                    && $embed['title'] === "Pedido #{$request->id} {$word}"
                    && $embed['description'] === $request->title
                    && $embed['url'] === "http://front.test/requests/{$request->id}"
                    && $fields['Prioridade'] === 'Baixa'
                    && $fields['Resultado'] === $result
                    && $fields['Decidido por'] === 'Ana Analista'
                    && $fields['Justificativa'] === 'Motivo da decisão';
            });
            $this->assertDatabaseHas('notification_logs', [
                'internal_request_id' => $request->id,
                'event' => 'decided',
                'attempt' => 1,
                'status' => 'sent',
            ]);
        }
    }

    public function test_long_justification_is_cut_to_the_discord_field_limit(): void
    {
        Http::fake();
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();

        $this->decide($request, $analyst, 'approve', str_repeat('á', 1500));

        Http::assertSent(function (Request $http) {
            $fields = collect($http->data()['embeds'][0]['fields'])->pluck('value', 'name');

            return mb_strlen($fields['Justificativa']) <= 1024 && mb_strlen($fields['Justificativa']) > 0;
        });
        $this->assertDatabaseHas('notification_logs', ['internal_request_id' => $request->id, 'status' => 'sent']);
    }

    public function test_invalid_webhook_retries_four_times_then_goes_to_failed_jobs(): void
    {
        config(['queue.default' => 'database']);
        Http::fake(['*' => Http::response(['message' => 'Unknown Webhook'], 500)]);
        $this->freezeTime();
        $backoff = [60, 300, 900];

        $id = $this->actingAs(User::factory()->create())->postJson('/api/internal-requests', $this->payload())
            ->assertCreated()->json('data.id');

        $this->assertSame(1, DB::table('jobs')->count());

        for ($i = 1; $i <= 4; $i++) {
            $this->artisan('queue:work', ['--once' => true, '--sleep' => 0])->assertSuccessful();
            $this->assertDatabaseCount('notification_logs', $i);

            if ($i < 4) {
                $wait = $backoff[$i - 1];
                $this->assertSame(1, DB::table('jobs')->count(), "job released after attempt {$i}");
                $this->assertSame(
                    now()->addSeconds($wait)->getTimestamp(),
                    (int) DB::table('jobs')->value('available_at'),
                    "available_at after attempt {$i} must be now + {$wait}s",
                );

                $this->travel($wait - 1)->seconds();
                $this->artisan('queue:work', ['--once' => true, '--sleep' => 0])->assertSuccessful();
                $this->assertDatabaseCount('notification_logs', $i);
                $this->assertSame(1, DB::table('jobs')->count(), "job must not run before {$wait}s");

                $this->travel(1)->seconds();
            }
        }

        $logs = DB::table('notification_logs')->where('internal_request_id', $id)->orderBy('attempt')->get();
        $this->assertSame([1, 2, 3, 4], $logs->pluck('attempt')->map(fn ($a) => (int) $a)->all());
        $this->assertSame(['failed'], $logs->pluck('status')->unique()->all());
        $this->assertSame(['discord'], $logs->pluck('channel')->unique()->all());
        $this->assertSame(['created'], $logs->pluck('event')->unique()->all());
        foreach ($logs as $log) {
            $this->assertNotEmpty($log->error);
        }

        $this->assertSame(1, DB::table('failed_jobs')->count());
        $this->assertSame(0, DB::table('jobs')->count());
        Http::assertSentCount(4);
    }

    public function test_job_succeeding_on_retry_logs_failure_then_success(): void
    {
        config(['queue.default' => 'database']);
        Http::fakeSequence()->push('err', 500)->push([], 204);

        $this->actingAs(User::factory()->create())->postJson('/api/internal-requests', $this->payload())->assertCreated();

        $this->artisan('queue:work', ['--once' => true, '--sleep' => 0])->assertSuccessful();
        $this->travel(2)->minutes();
        $this->artisan('queue:work', ['--once' => true, '--sleep' => 0])->assertSuccessful();

        $logs = DB::table('notification_logs')->orderBy('attempt')->get();
        $this->assertSame(['failed', 'sent'], $logs->pluck('status')->all());
        $this->assertSame([1, 2], $logs->pluck('attempt')->map(fn ($a) => (int) $a)->all());
        $this->assertSame(0, DB::table('failed_jobs')->count());
        $this->assertSame(0, DB::table('jobs')->count());
    }

    public function test_webhook_url_never_reaches_the_queue_payload(): void
    {
        config(['queue.default' => 'database']);
        Http::fake();

        $this->actingAs(User::factory()->create())->postJson('/api/internal-requests', $this->payload())->assertCreated();

        $payload = (string) DB::table('jobs')->value('payload');
        $this->assertNotSame('', $payload);
        $this->assertStringNotContainsString('discord.test', $payload);
        $this->assertStringNotContainsString('/token', $payload);
    }

    public function test_connection_error_does_not_leak_the_webhook_url(): void
    {
        config(['queue.default' => 'database']);
        Http::fake(fn () => throw new ConnectionException('cURL error 28: Operation timed out for '.self::WEBHOOK));

        $this->actingAs(User::factory()->create())->postJson('/api/internal-requests', $this->payload())->assertCreated();

        for ($i = 1; $i <= 4; $i++) {
            $this->artisan('queue:work', ['--once' => true, '--sleep' => 0])->assertSuccessful();
            $this->travel(16)->minutes();
        }

        $errors = DB::table('notification_logs')->pluck('error');
        $this->assertCount(4, $errors);
        foreach ($errors as $error) {
            $this->assertStringContainsString('Discord webhook connection failed', $error);
            $this->assertStringNotContainsString('token', $error);
        }

        $failed = DB::table('failed_jobs')->first();
        $this->assertNotNull($failed);
        $this->assertStringNotContainsString('token', $failed->exception);
        $this->assertStringNotContainsString('discord.test', $failed->exception);
        $this->assertStringNotContainsString('token', $failed->payload);
    }

    public function test_http_error_status_does_not_leak_the_webhook_url(): void
    {
        config(['queue.default' => 'database']);
        Http::fake(['*' => Http::response('bad', 500)]);

        $this->actingAs(User::factory()->create())->postJson('/api/internal-requests', $this->payload())->assertCreated();
        $this->artisan('queue:work', ['--once' => true, '--sleep' => 0])->assertSuccessful();

        $error = (string) DB::table('notification_logs')->value('error');
        $this->assertStringContainsString('status 500', $error);
        $this->assertStringNotContainsString('token', $error);
    }

    private function assertNothingSentToTheTeam(): void
    {
        Notification::assertSentOnDemandTimes(InternalRequestCreated::class, 0);
        Notification::assertSentOnDemandTimes(InternalRequestDecided::class, 0);
    }
}
