<?php

namespace Tests\Feature\InternalRequests;

use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use App\Models\InternalRequestStatusChange;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShowInternalRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_without_session_is_unauthorized(): void
    {
        $request = InternalRequest::factory()->create();

        $this->getJson("/api/internal-requests/{$request->id}")->assertUnauthorized();
    }

    public function test_owner_analyst_and_admin_see_the_detail_with_history(): void
    {
        $owner = User::factory()->create();
        $request = InternalRequest::factory()->create(['requester_id' => $owner->id]);
        InternalRequestStatusChange::factory()->create([
            'internal_request_id' => $request->id,
            'from_status' => null,
            'to_status' => InternalRequestStatus::Open,
            'changed_by' => $owner->id,
        ]);

        foreach ([$owner, User::factory()->analyst()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user)
                ->getJson("/api/internal-requests/{$request->id}")
                ->assertOk()
                ->assertJsonPath('data.id', $request->id)
                ->assertJsonPath('data.requester.id', $owner->id)
                ->assertJsonPath('data.requester.name', $owner->name)
                ->assertJsonPath('data.area.id', $owner->area_id)
                ->assertJsonPath('data.assigned_to', null)
                ->assertJsonPath('data.decision', null)
                ->assertJsonCount(1, 'data.history')
                ->assertJsonPath('data.history.0.from_status', null)
                ->assertJsonPath('data.history.0.to_status', 'open')
                ->assertJsonPath('data.history.0.changed_by.id', $owner->id);
        }
    }

    public function test_history_is_in_chronological_order(): void
    {
        $owner = User::factory()->create();
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create(['requester_id' => $owner->id]);
        InternalRequestStatusChange::factory()->create([
            'internal_request_id' => $request->id,
            'from_status' => InternalRequestStatus::Open,
            'to_status' => InternalRequestStatus::InReview,
            'changed_by' => $analyst->id,
            'created_at' => now(),
        ]);
        InternalRequestStatusChange::factory()->create([
            'internal_request_id' => $request->id,
            'from_status' => null,
            'to_status' => InternalRequestStatus::Open,
            'changed_by' => $owner->id,
            'created_at' => now()->subHour(),
        ]);

        $this->actingAs($owner)
            ->getJson("/api/internal-requests/{$request->id}")
            ->assertJsonPath('data.history.0.to_status', 'open')
            ->assertJsonPath('data.history.1.to_status', 'in_review')
            ->assertJsonPath('data.history.1.changed_by.id', $analyst->id);
    }

    public function test_in_review_request_shows_who_is_analyzing(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();

        $this->actingAs($analyst)
            ->getJson("/api/internal-requests/{$request->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'in_review')
            ->assertJsonPath('data.assigned_to.id', $analyst->id)
            ->assertJsonPath('data.assigned_to.name', $analyst->name)
            ->assertJsonPath('data.decision', null);
    }

    public function test_decision_format_for_an_approved_request(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->approved($analyst)->create();

        $response = $this->actingAs($analyst)
            ->getJson("/api/internal-requests/{$request->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.decision.decided_by.id', $analyst->id)
            ->assertJsonPath('data.decision.decided_by.name', $analyst->name)
            ->assertJsonPath('data.decision.justification', $request->decision_justification)
            ->assertJsonStructure(['data' => ['decision' => ['decided_by', 'decided_at', 'justification']]]);

        $this->assertNotNull($response->json('data.decision.decided_at'));
        $response->assertJsonMissingPath('data.decision_justification');
    }

    public function test_detail_has_the_documented_fields(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->getJson("/api/internal-requests/{$request->id}")
            ->assertJsonStructure(['data' => [
                'id', 'title', 'description', 'priority', 'status', 'requester' => ['id', 'name'],
                'area' => ['id', 'name'], 'assigned_to', 'assigned_at', 'decision', 'history', 'created_at',
                'can' => ['update', 'delete'],
            ]]);
    }

    public function test_requester_cannot_see_someone_elses_request(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->create())
            ->getJson("/api/internal-requests/{$request->id}")
            ->assertNotFound();
    }

    public function test_missing_request_is_not_found(): void
    {
        foreach ([User::factory()->create(), User::factory()->analyst()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user)->getJson('/api/internal-requests/999999')->assertNotFound();
        }
    }

    public function test_can_flags_follow_profile_and_status(): void
    {
        $owner = User::factory()->create();
        $open = InternalRequest::factory()->create(['requester_id' => $owner->id]);
        $inReview = InternalRequest::factory()->inReview()->create(['requester_id' => $owner->id]);
        $analyst = User::factory()->analyst()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($owner)->getJson("/api/internal-requests/{$open->id}")
            ->assertJsonPath('data.can.update', true)->assertJsonPath('data.can.delete', true);
        $this->actingAs($owner)->getJson("/api/internal-requests/{$inReview->id}")
            ->assertJsonPath('data.can.update', false)->assertJsonPath('data.can.delete', false);
        $this->actingAs($analyst)->getJson("/api/internal-requests/{$open->id}")
            ->assertJsonPath('data.can.update', false)->assertJsonPath('data.can.delete', false);
        $this->actingAs($admin)->getJson("/api/internal-requests/{$open->id}")
            ->assertJsonPath('data.can.update', true)->assertJsonPath('data.can.delete', true);
        $this->actingAs($admin)->getJson("/api/internal-requests/{$inReview->id}")
            ->assertJsonPath('data.can.update', false)->assertJsonPath('data.can.delete', false);
    }
}
