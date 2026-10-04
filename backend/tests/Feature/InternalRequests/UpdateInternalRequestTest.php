<?php

namespace Tests\Feature\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpdateInternalRequestTest extends TestCase
{
    use RefreshDatabase;

    private const CHANGES = ['title' => 'Novo título', 'description' => 'Nova descrição', 'priority' => 'low'];

    public function test_without_session_is_unauthorized(): void
    {
        $request = InternalRequest::factory()->create();

        $this->patchJson("/api/internal-requests/{$request->id}", self::CHANGES)->assertUnauthorized();
    }

    public function test_owner_and_admin_edit_an_open_request(): void
    {
        $owner = User::factory()->create();

        foreach ([$owner, User::factory()->admin()->create()] as $user) {
            $request = InternalRequest::factory()->create(['requester_id' => $owner->id, 'priority' => 'high']);

            $this->actingAs($user)
                ->patchJson("/api/internal-requests/{$request->id}", self::CHANGES)
                ->assertOk()
                ->assertJsonPath('data.id', $request->id)
                ->assertJsonPath('data.title', 'Novo título')
                ->assertJsonPath('data.description', 'Nova descrição')
                ->assertJsonPath('data.priority', 'low')
                ->assertJsonPath('data.status', 'open')
                ->assertJsonPath('data.requester.id', $owner->id);

            $request->refresh();
            $this->assertSame('Novo título', $request->title);
            $this->assertSame('low', $request->priority->value);
        }
    }

    public function test_partial_edit_changes_only_the_sent_field_and_keeps_history(): void
    {
        $owner = User::factory()->create();
        $request = InternalRequest::factory()->create(['requester_id' => $owner->id, 'priority' => 'low']);
        $request->statusChanges()->create(['from_status' => null, 'to_status' => 'open', 'changed_by' => $owner->id]);
        $title = $request->title;
        $description = $request->description;

        $this->actingAs($owner)
            ->patchJson("/api/internal-requests/{$request->id}", ['priority' => 'high'])
            ->assertOk()
            ->assertJsonPath('data.priority', 'high');

        $request->refresh();
        $this->assertSame($title, $request->title);
        $this->assertSame($description, $request->description);
        $this->assertSame('high', $request->priority->value);
        $this->assertCount(1, $request->statusChanges);
    }

    public function test_edit_does_not_change_system_fields(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $request = InternalRequest::factory()->create(['requester_id' => $owner->id]);
        $areaId = $request->area_id;

        $this->actingAs($owner)
            ->patchJson("/api/internal-requests/{$request->id}", self::CHANGES + [
                'status' => 'approved', 'requester_id' => $other->id, 'area_id' => $other->area_id,
            ])
            ->assertOk();

        $request->refresh();
        $this->assertSame('open', $request->status->value);
        $this->assertSame($owner->id, $request->requester_id);
        $this->assertSame($areaId, $request->area_id);
    }

    public function test_analyst_cannot_edit(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->analyst()->create())
            ->patchJson("/api/internal-requests/{$request->id}", self::CHANGES)
            ->assertForbidden();

        $this->assertNotSame('Novo título', $request->fresh()->title);
    }

    public function test_another_requester_gets_not_found(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->create())
            ->patchJson("/api/internal-requests/{$request->id}", self::CHANGES)
            ->assertNotFound();

        $this->assertNotSame('Novo título', $request->fresh()->title);
    }

    public function test_missing_request_is_not_found(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->patchJson('/api/internal-requests/999999', self::CHANGES)
            ->assertNotFound();
    }

    public function test_editing_outside_open_is_refused_without_changes(): void
    {
        $owner = User::factory()->create();

        foreach (['inReview', 'approved', 'rejected'] as $state) {
            $request = InternalRequest::factory()->{$state}()->create(['requester_id' => $owner->id]);
            $before = $request->only(['title', 'description', 'priority', 'status']);

            foreach ([$owner, User::factory()->admin()->create()] as $user) {
                $this->actingAs($user)
                    ->patchJson("/api/internal-requests/{$request->id}", self::CHANGES)
                    ->assertConflict()
                    ->assertJsonStructure(['message']);
            }

            $this->assertEquals($before, $request->fresh()->only(['title', 'description', 'priority', 'status']), $state);
        }
    }

    public function test_check_order_is_permission_before_validation_before_status(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->analyst()->create())
            ->patchJson("/api/internal-requests/{$request->id}", ['title' => ''])
            ->assertForbidden();

        $this->actingAs(User::factory()->create())
            ->patchJson("/api/internal-requests/{$request->id}", ['title' => ''])
            ->assertNotFound();

        $owner = User::factory()->create();
        $inReview = InternalRequest::factory()->inReview()->create(['requester_id' => $owner->id]);

        $this->actingAs($owner)
            ->patchJson("/api/internal-requests/{$inReview->id}", ['title' => ''])
            ->assertUnprocessable();

        $this->actingAs($owner)
            ->patchJson("/api/internal-requests/{$inReview->id}", ['title' => 'ok'])
            ->assertConflict();
    }

    public function test_validation_rules_on_edit(): void
    {
        $owner = User::factory()->create();
        $request = InternalRequest::factory()->create(['requester_id' => $owner->id]);

        foreach ([
            'title' => '',
            'description' => '',
            'priority' => 'foo',
        ] as $field => $value) {
            $this->actingAs($owner)
                ->patchJson("/api/internal-requests/{$request->id}", [$field => $value])
                ->assertUnprocessable()
                ->assertJsonValidationErrors([$field]);
        }

        $this->actingAs($owner)
            ->patchJson("/api/internal-requests/{$request->id}", ['title' => str_repeat('a', 256)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);
    }

    public function test_saving_the_same_values_right_after_creating_is_ok(): void
    {
        $owner = User::factory()->create();
        $payload = ['title' => 'Mesmo título', 'description' => 'Mesma descrição', 'priority' => 'low'];

        $id = $this->actingAs($owner)->postJson('/api/internal-requests', $payload)->assertCreated()->json('data.id');

        $this->patchJson("/api/internal-requests/{$id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.title', 'Mesmo título');
    }
}
