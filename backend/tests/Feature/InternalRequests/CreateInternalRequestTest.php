<?php

namespace Tests\Feature\InternalRequests;

use App\Models\Area;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreateInternalRequestTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function payload(array $overrides = []): array
    {
        return $overrides + ['title' => 'Notebook novo', 'description' => 'Substituir o atual', 'priority' => 'high'];
    }

    public function test_without_session_is_unauthorized(): void
    {
        $this->postJson('/api/internal-requests', $this->payload())->assertUnauthorized();
    }

    public function test_requester_and_admin_create_an_open_request_filled_by_the_system(): void
    {
        foreach ([User::factory()->create(), User::factory()->admin()->create()] as $user) {
            $response = $this->actingAs($user)
                ->postJson('/api/internal-requests', $this->payload())
                ->assertCreated()
                ->assertJsonPath('data.title', 'Notebook novo')
                ->assertJsonPath('data.description', 'Substituir o atual')
                ->assertJsonPath('data.priority', 'high')
                ->assertJsonPath('data.status', 'open')
                ->assertJsonPath('data.requester.id', $user->id)
                ->assertJsonPath('data.area.id', $user->area_id);

            $request = InternalRequest::findOrFail($response->json('data.id'));
            $this->assertSame('open', $request->status->value);
            $this->assertSame($user->id, $request->requester_id);
            $this->assertSame($user->area_id, $request->area_id);
            $this->assertNotNull($request->created_at);

            $history = $request->statusChanges;
            $this->assertCount(1, $history);
            $this->assertNull($history[0]->from_status);
            $this->assertSame('open', $history[0]->to_status->value);
            $this->assertSame($user->id, $history[0]->changed_by);
        }
    }

    public function test_client_cannot_set_system_fields(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/internal-requests', $this->payload([
                'status' => 'approved',
                'requester_id' => $other->id,
                'area_id' => $other->area_id,
            ]))
            ->assertCreated();

        $this->assertSame('open', $response->json('data.status'));
        $this->assertSame($user->id, $response->json('data.requester.id'));
        $this->assertSame($user->area_id, $response->json('data.area.id'));
    }

    public function test_area_is_kept_as_it_was_on_the_day_of_the_request(): void
    {
        $user = User::factory()->create();
        $originalArea = $user->area_id;

        $id = $this->actingAs($user)
            ->postJson('/api/internal-requests', $this->payload())
            ->assertCreated()
            ->json('data.id');

        $user->update(['area_id' => Area::factory()->create()->id]);

        $this->assertSame($originalArea, InternalRequest::findOrFail($id)->area_id);
        $this->actingAs($user->fresh())
            ->getJson("/api/internal-requests/{$id}")
            ->assertJsonPath('data.area.id', $originalArea);
    }

    public function test_analyst_cannot_create(): void
    {
        $this->actingAs(User::factory()->analyst()->create())
            ->postJson('/api/internal-requests', $this->payload())
            ->assertForbidden()
            ->assertJsonPath('message', 'Esta ação não é autorizada.');

        $this->assertSame(0, InternalRequest::count());
    }

    public function test_analyst_with_invalid_payload_gets_403_not_422(): void
    {
        $this->actingAs(User::factory()->analyst()->create())
            ->postJson('/api/internal-requests', [])
            ->assertForbidden();
    }

    public function test_missing_fields_are_rejected_with_portuguese_messages(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/internal-requests', $this->payload(['title' => '']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title'])
            ->assertJsonPath('errors.title.0', fn (string $message) => str_contains($message, 'título') && ! str_contains($message, 'required'));

        $this->actingAs($user)
            ->postJson('/api/internal-requests', ['title' => 'x', 'priority' => 'low'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['description'])
            ->assertJsonPath('errors.description.0', fn (string $message) => str_contains($message, 'descrição') && ! str_contains($message, 'required'));

        $this->actingAs($user)
            ->postJson('/api/internal-requests', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'description', 'priority']);

        $this->assertSame(0, InternalRequest::count());
    }

    public function test_invalid_priority_is_rejected(): void
    {
        $this->actingAs(User::factory()->create())
            ->postJson('/api/internal-requests', $this->payload(['priority' => 'urgent']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['priority']);
    }

    public function test_title_over_255_characters_is_rejected_and_255_is_accepted(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/internal-requests', $this->payload(['title' => str_repeat('a', 256)]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);

        $this->actingAs($user)
            ->postJson('/api/internal-requests', $this->payload(['title' => str_repeat('a', 255)]))
            ->assertCreated();
    }
}
