<?php

namespace Tests\Feature\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssumeInternalRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_without_session_is_unauthorized(): void
    {
        $request = InternalRequest::factory()->create();

        $this->postJson("/api/internal-requests/{$request->id}/assign")->assertUnauthorized();
        $this->assertSame('open', $request->fresh()->status->value);
    }

    public function test_analyst_and_admin_assume_an_open_request(): void
    {
        foreach ([User::factory()->analyst()->create(), User::factory()->admin()->create()] as $user) {
            $request = InternalRequest::factory()->create();

            $this->actingAs($user)
                ->postJson("/api/internal-requests/{$request->id}/assign")
                ->assertOk()
                ->assertJsonPath('data.id', $request->id)
                ->assertJsonPath('data.status', 'in_review')
                ->assertJsonPath('data.assigned_to.id', $user->id)
                ->assertJsonPath('data.decision', null);

            $fresh = $request->fresh();
            $this->assertSame('in_review', $fresh->status->value);
            $this->assertSame($user->id, $fresh->assigned_to);
            $this->assertNotNull($fresh->assigned_at);
            $this->assertNull($fresh->decided_at);

            $history = $fresh->statusChanges()->get();
            $this->assertCount(1, $history);
            $this->assertSame('open', $history[0]->from_status->value);
            $this->assertSame('in_review', $history[0]->to_status->value);
            $this->assertSame($user->id, $history[0]->changed_by);
        }
    }

    public function test_response_has_the_detail_format_with_history(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->create();

        $this->actingAs($analyst)
            ->postJson("/api/internal-requests/{$request->id}/assign")
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'id', 'title', 'description', 'priority', 'status', 'requester', 'area',
                'assigned_to', 'assigned_at', 'decision', 'history', 'created_at', 'can',
            ]])
            ->assertJsonPath('data.history.0.to_status', 'in_review')
            ->assertJsonPath('data.history.0.changed_by.id', $analyst->id);
    }

    public function test_requester_cannot_assume(): void
    {
        $owner = User::factory()->create();
        $request = InternalRequest::factory()->create(['requester_id' => $owner->id]);

        $this->actingAs($owner)
            ->postJson("/api/internal-requests/{$request->id}/assign")
            ->assertForbidden();

        $this->actingAs(User::factory()->create())
            ->postJson("/api/internal-requests/{$request->id}/assign")
            ->assertNotFound();

        $fresh = $request->fresh();
        $this->assertSame('open', $fresh->status->value);
        $this->assertNull($fresh->assigned_to);
        $this->assertSame(0, $request->statusChanges()->count());
    }

    public function test_cannot_assume_outside_open_and_nothing_changes(): void
    {
        foreach (['inReview', 'approved', 'rejected'] as $state) {
            $request = InternalRequest::factory()->{$state}()->create();
            $before = $request->fresh()->getAttributes();

            foreach ([User::factory()->analyst()->create(), User::factory()->admin()->create()] as $user) {
                $this->actingAs($user)
                    ->postJson("/api/internal-requests/{$request->id}/assign")
                    ->assertConflict()
                    ->assertJsonStructure(['message']);
            }

            $this->assertEquals($before, $request->fresh()->getAttributes(), $state);
            $this->assertSame(0, $request->statusChanges()->count());
        }
    }

    public function test_missing_request_is_not_found(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/internal-requests/999999/assign')
            ->assertNotFound();
    }

    public function test_deleted_request_is_not_found(): void
    {
        $request = InternalRequest::factory()->create();
        $request->delete();

        foreach ([User::factory()->analyst()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user)
                ->postJson("/api/internal-requests/{$request->id}/assign")
                ->assertNotFound();
        }
    }
}
