<?php

namespace Tests\Feature\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BulkDeleteInternalRequestsTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/internal-requests/bulk/delete';

    public function test_without_session_is_unauthorized(): void
    {
        $request = InternalRequest::factory()->create();

        $this->postJson(self::URL, ['ids' => [$request->id]])->assertUnauthorized();
        $this->assertNotSoftDeleted($request);
    }

    public function test_requester_deletes_only_their_own_open_requests(): void
    {
        $owner = User::factory()->create();
        $mine = InternalRequest::factory()->count(2)->create(['requester_id' => $owner->id]);
        $others = InternalRequest::factory()->create();

        $this->actingAs($owner)
            ->postJson(self::URL, ['ids' => [$mine[0]->id, $others->id, $mine[1]->id]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [$mine[0]->id, $mine[1]->id],
                'skipped' => [['id' => $others->id, 'reason' => 'not_found', 'message' => 'Pedido não encontrado.']],
            ]]);

        foreach ($mine as $request) {
            $this->assertSoftDeleted($request);
            $this->assertSame($owner->id, InternalRequest::withTrashed()->find($request->id)->deleted_by);
        }
        $this->assertNotSoftDeleted($others);
    }

    public function test_admin_deletes_open_requests_of_any_person(): void
    {
        $admin = User::factory()->admin()->create();
        $requests = InternalRequest::factory()->count(3)->create();

        $this->actingAs($admin)
            ->postJson(self::URL, ['ids' => $requests->pluck('id')->all()])
            ->assertOk()
            ->assertExactJson(['data' => ['done' => $requests->pluck('id')->all(), 'skipped' => []]]);

        foreach ($requests as $request) {
            $this->assertSoftDeleted($request);
            $this->assertSame($admin->id, InternalRequest::withTrashed()->find($request->id)->deleted_by);
        }
    }

    public function test_requests_outside_open_are_skipped_as_not_open(): void
    {
        $admin = User::factory()->admin()->create();
        $open = InternalRequest::factory()->create();
        $inReview = InternalRequest::factory()->inReview()->create();
        $approved = InternalRequest::factory()->approved()->create();

        $this->actingAs($admin)
            ->postJson(self::URL, ['ids' => [$inReview->id, $open->id, $approved->id]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [$open->id],
                'skipped' => [
                    ['id' => $inReview->id, 'reason' => 'not_open', 'message' => __('internal_requests.not_open')],
                    ['id' => $approved->id, 'reason' => 'not_open', 'message' => __('internal_requests.not_open')],
                ],
            ]]);

        $this->assertSoftDeleted($open);
        $this->assertNotSoftDeleted($inReview);
        $this->assertNotSoftDeleted($approved);
    }

    public function test_requester_own_request_in_review_is_not_open_and_stays(): void
    {
        $owner = User::factory()->create();
        $request = InternalRequest::factory()->inReview()->create(['requester_id' => $owner->id]);

        $this->actingAs($owner)
            ->postJson(self::URL, ['ids' => [$request->id]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [],
                'skipped' => [['id' => $request->id, 'reason' => 'not_open', 'message' => __('internal_requests.not_open')]],
            ]]);

        $this->assertNotSoftDeleted($request);
        $this->assertNull(InternalRequest::withTrashed()->find($request->id)->deleted_by);
    }

    public function test_mixed_batch_keeps_the_order_and_reports_missing_and_deleted_ids(): void
    {
        $admin = User::factory()->admin()->create();
        $first = InternalRequest::factory()->create();
        $inReview = InternalRequest::factory()->inReview()->create();
        $deleted = InternalRequest::factory()->create();
        $deleted->delete();
        $last = InternalRequest::factory()->create();
        $message = 'Pedido não encontrado.';

        $this->actingAs($admin)
            ->postJson(self::URL, ['ids' => [$last->id, 999999, $inReview->id, $deleted->id, $first->id]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [$last->id, $first->id],
                'skipped' => [
                    ['id' => 999999, 'reason' => 'not_found', 'message' => $message],
                    ['id' => $inReview->id, 'reason' => 'not_open', 'message' => __('internal_requests.not_open')],
                    ['id' => $deleted->id, 'reason' => 'not_found', 'message' => $message],
                ],
            ]]);
    }

    public function test_other_persons_request_and_missing_id_look_the_same_to_the_requester(): void
    {
        $requester = User::factory()->create();
        $others = InternalRequest::factory()->create();

        $response = $this->actingAs($requester)
            ->postJson(self::URL, ['ids' => [$others->id, 999999]])
            ->assertOk()
            ->assertJsonPath('data.done', []);

        $skipped = $response->json('data.skipped');
        $this->assertSame('not_found', $skipped[0]['reason']);
        $this->assertSame('Pedido não encontrado.', $skipped[0]['message']);
        $this->assertSame($skipped[0]['reason'], $skipped[1]['reason']);
        $this->assertSame($skipped[0]['message'], $skipped[1]['message']);
    }

    public function test_analyst_is_forbidden_and_nothing_changes(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->analyst()->create())
            ->postJson(self::URL, ['ids' => [$request->id]])
            ->assertForbidden();

        $this->assertNotSoftDeleted($request);
    }

    public function test_profile_is_checked_before_validation(): void
    {
        $this->actingAs(User::factory()->analyst()->create())
            ->postJson(self::URL, [])
            ->assertForbidden();
    }

    public function test_ids_are_required(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->postJson(self::URL, [])->assertUnprocessable()->assertJsonValidationErrors('ids');
        $this->postJson(self::URL, ['ids' => []])->assertUnprocessable()->assertJsonValidationErrors('ids');
    }

    public function test_more_than_100_ids_is_rejected_and_100_is_accepted(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->postJson(self::URL, ['ids' => range(1, 101)])->assertUnprocessable()->assertJsonValidationErrors('ids');
        $this->postJson(self::URL, ['ids' => range(1, 100)])->assertOk()->assertJsonCount(100, 'data.skipped');
    }

    public function test_non_integer_id_is_rejected(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->postJson(self::URL, ['ids' => [1, 'abc']])->assertUnprocessable()->assertJsonValidationErrors('ids.1');
        $this->postJson(self::URL, ['ids' => 'abc'])->assertUnprocessable()->assertJsonValidationErrors('ids');
    }

    public function test_repeated_id_is_rejected_and_nothing_is_deleted(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson(self::URL, ['ids' => [$request->id, $request->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['ids.0', 'ids.1']);

        $this->assertNotSoftDeleted($request);
    }
}
