<?php

namespace Tests\Feature\Logging;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\Concerns\CapturesLogs;
use Tests\TestCase;

class RequestIdTest extends TestCase
{
    use CapturesLogs, RefreshDatabase;

    private function assertUuid(?string $value): void
    {
        $this->assertNotNull($value);
        $this->assertTrue(Str::isUuid($value), "'{$value}' is not a UUID.");
    }

    public function test_every_response_carries_a_request_id(): void
    {
        $this->assertUuid($this->getJson('/api/internal-requests')->assertUnauthorized()->headers->get('X-Request-Id'));
        $this->assertUuid($this->getJson('/api/does-not-exist')->assertNotFound()->headers->get('X-Request-Id'));
        $this->assertUuid($this->get('/up')->assertOk()->headers->get('X-Request-Id'));

        $user = User::factory()->create();
        $this->assertUuid($this->actingAs($user)->getJson('/api/me')->assertOk()->headers->get('X-Request-Id'));
    }

    public function test_a_valid_incoming_request_id_is_echoed_back(): void
    {
        foreach (['abc-123_DEF.456', str_repeat('a', 128)] as $id) {
            $this->withHeader('X-Request-Id', $id)->get('/up')->assertHeader('X-Request-Id', $id);
        }
    }

    public function test_an_invalid_incoming_request_id_is_replaced_by_a_uuid(): void
    {
        foreach (['has space', "line\nbreak", str_repeat('a', 129), 'with/slash'] as $id) {
            $value = $this->withHeader('X-Request-Id', $id)->get('/up')->headers->get('X-Request-Id');

            $this->assertNotSame($id, $value);
            $this->assertUuid($value);
        }
    }

    public function test_request_logs_carry_the_response_request_id(): void
    {
        $this->captureLogs();
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->create();

        $response = $this->actingAs($analyst)
            ->withHeader('X-Request-Id', 'trace-1')
            ->postJson("/api/internal-requests/{$request->id}/assign")
            ->assertOk();

        $log = $this->singleLog('internal_request.assumed');
        $this->assertSame($response->headers->get('X-Request-Id'), $log['extra']['request_id']);
        $this->assertSame('trace-1', $log['extra']['request_id']);
    }

    public function test_jobs_dispatched_by_a_request_log_the_same_request_id(): void
    {
        $this->captureLogs();
        config([
            'queue.default' => 'database',
            'services.discord.webhook_url' => 'https://discord.test/api/webhooks/1/secret-token',
        ]);
        Http::fake(['discord.test/*' => Http::response([], 500)]);
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/internal-requests', ['title' => 'Notebook', 'description' => 'Trocar o atual', 'priority' => 'high'])
            ->assertCreated();
        $requestId = $response->headers->get('X-Request-Id');

        Artisan::call('queue:work', ['--once' => true, '--tries' => 1]);

        $failure = $this->singleLog('notification.failed');
        $this->assertSame($requestId, $failure['extra']['request_id']);
        $this->assertSame($requestId, $this->singleLog('internal_request.created')['extra']['request_id']);
    }
}
