<?php

namespace Tests\Feature\Logging;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\CapturesLogs;
use Tests\TestCase;

class BusinessEventLogsTest extends TestCase
{
    use CapturesLogs, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->captureLogs();
    }

    public function test_assume_approve_and_reject_log_the_request_and_who_acted(): void
    {
        $analyst = User::factory()->analyst()->create();

        $open = InternalRequest::factory()->create();
        $this->actingAs($analyst)->postJson("/api/internal-requests/{$open->id}/assign")->assertOk();

        $toApprove = InternalRequest::factory()->inReview($analyst)->create();
        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$toApprove->id}/approve", ['justification' => 'Dentro do orçamento'])
            ->assertOk();

        $toReject = InternalRequest::factory()->inReview($analyst)->create();
        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$toReject->id}/reject", ['justification' => 'Fora do escopo'])
            ->assertOk();

        $this->assertSame(['internal_request_id' => $open->id, 'user_id' => $analyst->id], $this->singleLog('internal_request.assumed')['context']);
        $this->assertSame(['internal_request_id' => $toApprove->id, 'user_id' => $analyst->id], $this->singleLog('internal_request.approved')['context']);
        $this->assertSame(['internal_request_id' => $toReject->id, 'user_id' => $analyst->id], $this->singleLog('internal_request.rejected')['context']);
        $this->assertSame('INFO', $this->singleLog('internal_request.assumed')['level_name']);
    }

    public function test_the_event_logs_who_acted_even_when_it_is_an_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $request = InternalRequest::factory()->create();

        $this->actingAs($admin)->postJson("/api/internal-requests/{$request->id}/assign")->assertOk();

        $this->assertSame($admin->id, $this->singleLog('internal_request.assumed')['context']['user_id']);
    }

    public function test_a_conflicting_action_logs_no_event(): void
    {
        $analyst = User::factory()->analyst()->create();
        $inReview = InternalRequest::factory()->inReview($analyst)->create();
        $approved = InternalRequest::factory()->approved($analyst)->create();

        $this->actingAs($analyst)->postJson("/api/internal-requests/{$inReview->id}/assign")->assertStatus(409);
        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$approved->id}/approve", ['justification' => 'De novo'])
            ->assertStatus(409);
        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$approved->id}/reject", ['justification' => 'De novo'])
            ->assertStatus(409);

        $this->assertSame([], $this->logRecords('internal_request.assumed'));
        $this->assertSame([], $this->logRecords('internal_request.approved'));
        $this->assertSame([], $this->logRecords('internal_request.rejected'));
    }

    public function test_create_and_delete_log_the_request_and_who_acted(): void
    {
        $user = User::factory()->create();

        $id = $this->actingAs($user)
            ->postJson('/api/internal-requests', ['title' => 'Notebook novo', 'description' => 'Substituir o atual', 'priority' => 'high'])
            ->assertCreated()
            ->json('data.id');
        $this->assertSame(['internal_request_id' => $id, 'user_id' => $user->id], $this->singleLog('internal_request.created')['context']);

        $this->actingAs($user)->deleteJson("/api/internal-requests/{$id}")->assertNoContent();
        $this->assertSame(['internal_request_id' => $id, 'user_id' => $user->id], $this->singleLog('internal_request.deleted')['context']);
    }

    public function test_bulk_assume_logs_one_event_for_the_valid_request_and_none_for_the_skipped(): void
    {
        $analyst = User::factory()->analyst()->create();
        $open = InternalRequest::factory()->create();
        $inReview = InternalRequest::factory()->inReview()->create();

        $this->actingAs($analyst)
            ->postJson('/api/internal-requests/bulk/assign', ['ids' => [$open->id, $inReview->id]])
            ->assertOk();

        $this->assertCount(1, $this->logRecords('internal_request.assumed'));
        $this->assertSame(
            ['internal_request_id' => $open->id, 'user_id' => $analyst->id],
            $this->singleLog('internal_request.assumed')['context'],
        );
    }

    public function test_bulk_delete_logs_one_event_for_the_valid_request_and_none_for_the_skipped(): void
    {
        $user = User::factory()->create();
        $open = InternalRequest::factory()->create(['requester_id' => $user->id]);
        $inReview = InternalRequest::factory()->inReview()->create(['requester_id' => $user->id]);

        $this->actingAs($user)
            ->postJson('/api/internal-requests/bulk/delete', ['ids' => [$open->id, $inReview->id]])
            ->assertOk();

        $this->assertSame(
            ['internal_request_id' => $open->id, 'user_id' => $user->id],
            $this->singleLog('internal_request.deleted')['context'],
        );
    }

    public function test_a_wrong_password_logs_login_failed_with_ip_and_hashed_email(): void
    {
        User::factory()->create(['email' => 'Ana@Empresa.com']);

        $this->postJson('/api/login', ['email' => 'Ana@Empresa.com', 'password' => 'senha-errada-123'])->assertUnprocessable();

        $log = $this->singleLog('auth.login_failed');
        $this->assertSame('INFO', $log['level_name']);
        $this->assertSame(
            ['ip' => '127.0.0.1', 'email_hash' => hash('sha256', 'ana@empresa.com')],
            $log['context'],
        );
    }

    public function test_exceeding_the_login_limit_logs_login_throttled(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])->assertStatus(429);

        $log = $this->singleLog('auth.login_throttled');
        $this->assertSame('WARNING', $log['level_name']);
        $this->assertSame(
            ['ip' => '127.0.0.1', 'email_hash' => hash('sha256', 'ana@empresa.com')],
            $log['context'],
        );
        $this->assertCount(5, $this->logRecords('auth.login_failed'));
    }

    public function test_no_log_contains_secrets_or_free_text(): void
    {
        $webhook = 'https://discord.test/api/webhooks/1/secret-token';
        config(['services.discord.webhook_url' => $webhook, 'queue.default' => 'database']);
        Http::fake(['discord.test/*' => Http::response([], 500)]);

        User::factory()->create(['email' => 'ana@empresa.com']);
        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'senha-secreta-987'])->assertUnprocessable();

        $user = User::factory()->create(['email' => 'solicitante@empresa.com']);
        $analyst = User::factory()->analyst()->create(['email' => 'analista@empresa.com']);
        $id = $this->actingAs($user)
            ->postJson('/api/internal-requests', ['title' => 'Titulo sigiloso', 'description' => 'Descricao sigilosa', 'priority' => 'high'])
            ->assertCreated()
            ->json('data.id');
        $this->actingAs($analyst)->postJson("/api/internal-requests/{$id}/assign")->assertOk();
        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$id}/approve", ['justification' => 'Justificativa sigilosa'])
            ->assertOk();

        // The notifications are queued: the worker runs them and the Discord failure is logged.
        for ($i = 0, $pending = DB::table('jobs')->count(); $i < $pending; $i++) {
            Artisan::call('queue:work', ['--once' => true, '--tries' => 1]);
        }
        $this->assertNotEmpty($this->logRecords('notification.failed'));

        $logs = $this->allLogsAsString();
        foreach ([
            'senha-secreta-987', 'secret-token', 'discord.test', 'ana@empresa.com', 'solicitante@empresa.com',
            'analista@empresa.com', 'Descricao sigilosa', 'Titulo sigiloso', 'Justificativa sigilosa',
        ] as $secret) {
            $this->assertStringNotContainsString($secret, $logs);
        }
    }
}
