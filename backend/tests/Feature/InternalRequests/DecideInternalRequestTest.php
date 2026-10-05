<?php

namespace Tests\Feature\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DecideInternalRequestTest extends TestCase
{
    use RefreshDatabase;

    private const ACTIONS = ['approve' => 'approved', 'reject' => 'rejected'];

    public function test_without_session_is_unauthorized(): void
    {
        $request = InternalRequest::factory()->inReview()->create();

        foreach (array_keys(self::ACTIONS) as $action) {
            $this->postJson("/api/internal-requests/{$request->id}/{$action}", ['justification' => 'ok'])
                ->assertUnauthorized();
        }

        $this->assertSame('in_review', $request->fresh()->status->value);
    }

    public function test_the_analyst_who_assumed_approves_and_rejects(): void
    {
        foreach (self::ACTIONS as $action => $target) {
            $analyst = User::factory()->analyst()->create();
            $request = InternalRequest::factory()->inReview($analyst)->create();

            $this->actingAs($analyst)
                ->postJson("/api/internal-requests/{$request->id}/{$action}", ['justification' => 'Dentro do orçamento'])
                ->assertOk()
                ->assertJsonPath('data.status', $target)
                ->assertJsonPath('data.decision.decided_by.id', $analyst->id)
                ->assertJsonPath('data.decision.justification', 'Dentro do orçamento')
                ->assertJsonPath('data.history.0.from_status', 'in_review')
                ->assertJsonPath('data.history.0.to_status', $target)
                ->assertJsonPath('data.history.0.changed_by.id', $analyst->id);

            $fresh = $request->fresh();
            $this->assertSame($target, $fresh->status->value);
            $this->assertSame($analyst->id, $fresh->decided_by);
            $this->assertNotNull($fresh->decided_at);
            $this->assertSame('Dentro do orçamento', $fresh->decision_justification);
            $this->assertSame($analyst->id, $fresh->assigned_to);

            $last = $fresh->statusChanges()->latest('id')->first();
            $this->assertSame('in_review', $last->from_status->value);
            $this->assertSame($target, $last->to_status->value);
            $this->assertSame($analyst->id, $last->changed_by);
        }
    }

    public function test_admin_decides_a_request_assumed_by_an_analyst(): void
    {
        foreach (self::ACTIONS as $action => $target) {
            $admin = User::factory()->admin()->create();
            $analyst = User::factory()->analyst()->create();
            $request = InternalRequest::factory()->inReview($analyst)->create();

            $this->actingAs($admin)
                ->postJson("/api/internal-requests/{$request->id}/{$action}", ['justification' => 'Decisão da gestão'])
                ->assertOk()
                ->assertJsonPath('data.status', $target)
                ->assertJsonPath('data.decision.decided_by.id', $admin->id);

            $fresh = $request->fresh();
            $this->assertSame($admin->id, $fresh->decided_by);
            $this->assertSame($analyst->id, $fresh->assigned_to);
            $this->assertSame($admin->id, $fresh->statusChanges()->latest('id')->first()->changed_by);
        }
    }

    public function test_only_who_assumed_or_admin_can_decide(): void
    {
        $owner = User::factory()->create();
        $request = InternalRequest::factory()->inReview()->create(['requester_id' => $owner->id]);
        $payload = ['justification' => 'ok'];

        foreach (array_keys(self::ACTIONS) as $action) {
            $this->actingAs(User::factory()->analyst()->create())
                ->postJson("/api/internal-requests/{$request->id}/{$action}", $payload)->assertForbidden();
            $this->actingAs($owner)
                ->postJson("/api/internal-requests/{$request->id}/{$action}", $payload)->assertForbidden();
            $this->actingAs(User::factory()->create())
                ->postJson("/api/internal-requests/{$request->id}/{$action}", $payload)->assertNotFound();
        }

        $this->assertSame('in_review', $request->fresh()->status->value);
        $this->assertNull($request->fresh()->decided_at);
        $this->assertSame(0, $request->statusChanges()->count());
    }

    public function test_justification_is_required_and_limited(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();

        foreach (array_keys(self::ACTIONS) as $action) {
            foreach ([[], ['justification' => ''], ['justification' => '   '], ['justification' => str_repeat('a', 10001)]] as $payload) {
                $this->actingAs($analyst)
                    ->postJson("/api/internal-requests/{$request->id}/{$action}", $payload)
                    ->assertUnprocessable()
                    ->assertJsonValidationErrors(['justification']);
            }
        }

        $message = $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$request->id}/approve", [])
            ->json('errors.justification.0');
        $this->assertStringContainsString('justificativa', $message);

        $this->assertSame('in_review', $request->fresh()->status->value);
        $this->assertSame(0, $request->statusChanges()->count());
    }

    public function test_justification_at_the_limit_is_accepted(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();

        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$request->id}/approve", ['justification' => str_repeat('a', 10000)])
            ->assertOk();
    }

    public function test_cannot_skip_the_review(): void
    {
        $request = InternalRequest::factory()->create();
        $admin = User::factory()->admin()->create();

        foreach (array_keys(self::ACTIONS) as $action) {
            $this->actingAs($admin)
                ->postJson("/api/internal-requests/{$request->id}/{$action}", ['justification' => 'ok'])
                ->assertConflict()
                ->assertJsonStructure(['message']);

            $this->actingAs(User::factory()->analyst()->create())
                ->postJson("/api/internal-requests/{$request->id}/{$action}", ['justification' => 'ok'])
                ->assertForbidden();
        }

        $fresh = $request->fresh();
        $this->assertSame('open', $fresh->status->value);
        $this->assertNull($fresh->decided_at);
        $this->assertSame(0, $request->statusChanges()->count());
    }

    public function test_decision_is_final(): void
    {
        $admin = User::factory()->admin()->create();

        foreach (['approved', 'rejected'] as $state) {
            $analyst = User::factory()->analyst()->create();
            $request = InternalRequest::factory()->{$state}($analyst)->create();
            $before = $request->fresh()->getAttributes();

            foreach (array_keys(self::ACTIONS) as $action) {
                foreach ([$admin, $analyst] as $user) {
                    $this->actingAs($user)
                        ->postJson("/api/internal-requests/{$request->id}/{$action}", ['justification' => 'mudei de ideia'])
                        ->assertConflict();
                }
            }

            $this->actingAs($admin)->postJson("/api/internal-requests/{$request->id}/assign")->assertConflict();

            $this->assertEquals($before, $request->fresh()->getAttributes(), $state);
            $this->assertSame(0, $request->statusChanges()->count());
        }
    }

    public function test_checks_run_in_the_documented_order(): void
    {
        $request = InternalRequest::factory()->inReview()->create();
        $this->actingAs(User::factory()->analyst()->create())
            ->postJson("/api/internal-requests/{$request->id}/approve", ['justification' => ''])
            ->assertForbidden();

        $open = InternalRequest::factory()->create();
        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/internal-requests/{$open->id}/approve", ['justification' => ''])
            ->assertUnprocessable();
    }

    public function test_missing_request_is_not_found(): void
    {
        foreach (array_keys(self::ACTIONS) as $action) {
            $this->actingAs(User::factory()->admin()->create())
                ->postJson("/api/internal-requests/999999/{$action}", ['justification' => 'ok'])
                ->assertNotFound();
        }
    }

    public function test_deleted_request_is_not_found(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();
        $request->delete();

        foreach (array_keys(self::ACTIONS) as $action) {
            foreach ([$analyst, User::factory()->admin()->create()] as $user) {
                $this->actingAs($user)
                    ->postJson("/api/internal-requests/{$request->id}/{$action}", ['justification' => 'ok'])
                    ->assertNotFound();
            }
        }
    }
}
