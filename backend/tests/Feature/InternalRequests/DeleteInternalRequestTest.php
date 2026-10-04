<?php

namespace Tests\Feature\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeleteInternalRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_without_session_is_unauthorized(): void
    {
        $request = InternalRequest::factory()->create();

        $this->deleteJson("/api/internal-requests/{$request->id}")->assertUnauthorized();
        $this->assertNotSoftDeleted($request);
    }

    public function test_owner_and_admin_delete_an_open_request(): void
    {
        $owner = User::factory()->create();

        foreach ([$owner, User::factory()->admin()->create()] as $user) {
            $request = InternalRequest::factory()->create(['requester_id' => $owner->id]);

            $this->actingAs($user)
                ->deleteJson("/api/internal-requests/{$request->id}")
                ->assertNoContent();

            $this->assertSoftDeleted($request);
            $this->assertSame($user->id, InternalRequest::withTrashed()->find($request->id)->deleted_by);
        }
    }

    public function test_analyst_cannot_delete(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->analyst()->create())
            ->deleteJson("/api/internal-requests/{$request->id}")
            ->assertForbidden();

        $this->assertNotSoftDeleted($request);
    }

    public function test_another_requester_gets_not_found(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->create())
            ->deleteJson("/api/internal-requests/{$request->id}")
            ->assertNotFound();

        $this->assertNotSoftDeleted($request);
    }

    public function test_deleting_outside_open_is_refused_and_the_request_stays(): void
    {
        $owner = User::factory()->create();

        foreach (['inReview', 'approved', 'rejected'] as $state) {
            $request = InternalRequest::factory()->{$state}()->create(['requester_id' => $owner->id]);

            foreach ([$owner, User::factory()->admin()->create()] as $user) {
                $this->actingAs($user)
                    ->deleteJson("/api/internal-requests/{$request->id}")
                    ->assertConflict()
                    ->assertJsonStructure(['message']);
            }

            $this->assertNotSoftDeleted($request);
        }
    }

    public function test_deleted_request_disappears_but_stays_in_the_database(): void
    {
        $owner = User::factory()->create();
        $request = InternalRequest::factory()->create(['requester_id' => $owner->id]);
        $keep = InternalRequest::factory()->create(['requester_id' => $owner->id]);

        $this->actingAs($owner)->deleteJson("/api/internal-requests/{$request->id}")->assertNoContent();

        $ids = array_column($this->actingAs($owner)->getJson('/api/internal-requests')->assertOk()->json('data'), 'id');
        $this->assertSame([$keep->id], $ids);

        $this->assertDatabaseHas('internal_requests', ['id' => $request->id]);
        $this->assertSoftDeleted('internal_requests', ['id' => $request->id]);
        $this->assertNotNull(InternalRequest::withTrashed()->find($request->id)->deleted_by);
    }

    public function test_deleted_request_is_not_found_for_every_action_and_profile(): void
    {
        $owner = User::factory()->create();
        $request = InternalRequest::factory()->create(['requester_id' => $owner->id]);
        $this->actingAs($owner)->deleteJson("/api/internal-requests/{$request->id}")->assertNoContent();

        foreach ([$owner, User::factory()->analyst()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user)->getJson("/api/internal-requests/{$request->id}")->assertNotFound();
            $this->actingAs($user)->patchJson("/api/internal-requests/{$request->id}", ['title' => 'x'])->assertNotFound();
            $this->actingAs($user)->deleteJson("/api/internal-requests/{$request->id}")->assertNotFound();
        }
    }
}
