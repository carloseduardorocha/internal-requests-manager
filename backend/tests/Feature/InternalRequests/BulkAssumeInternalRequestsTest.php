<?php

namespace Tests\Feature\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;
use App\Notifications\InternalRequestAssumed;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class BulkAssumeInternalRequestsTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/internal-requests/bulk/assign';

    public function test_without_session_is_unauthorized(): void
    {
        $request = InternalRequest::factory()->create();

        $this->postJson(self::URL, ['ids' => [$request->id]])->assertUnauthorized();
        $this->assertSame('open', $request->fresh()->status->value);
    }

    public function test_analyst_and_admin_assume_open_requests_with_history(): void
    {
        foreach ([User::factory()->analyst()->create(), User::factory()->admin()->create()] as $user) {
            $requests = InternalRequest::factory()->count(2)->create();
            $ids = $requests->pluck('id')->all();

            $this->actingAs($user)
                ->postJson(self::URL, ['ids' => $ids])
                ->assertOk()
                ->assertExactJson(['data' => ['done' => $ids, 'skipped' => []]]);

            foreach ($requests as $request) {
                $fresh = $request->fresh();
                $this->assertSame('in_review', $fresh->status->value);
                $this->assertSame($user->id, $fresh->assigned_to);
                $this->assertNotNull($fresh->assigned_at);

                $history = $fresh->statusChanges()->get();
                $this->assertCount(1, $history);
                $this->assertSame('open', $history[0]->from_status->value);
                $this->assertSame('in_review', $history[0]->to_status->value);
                $this->assertSame($user->id, $history[0]->changed_by);
            }
        }
    }

    public function test_requests_outside_open_are_skipped_as_not_open_and_unchanged(): void
    {
        $analyst = User::factory()->analyst()->create();
        $open = InternalRequest::factory()->create();
        $inReview = InternalRequest::factory()->inReview()->create();
        $approved = InternalRequest::factory()->approved()->create();
        $beforeReview = $inReview->fresh()->getAttributes();
        $beforeApproved = $approved->fresh()->getAttributes();

        $this->actingAs($analyst)
            ->postJson(self::URL, ['ids' => [$inReview->id, $open->id, $approved->id]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [$open->id],
                'skipped' => [
                    ['id' => $inReview->id, 'reason' => 'not_open', 'message' => __('internal_requests.not_open_to_assign')],
                    ['id' => $approved->id, 'reason' => 'not_open', 'message' => __('internal_requests.not_open_to_assign')],
                ],
            ]]);

        $this->assertEquals($beforeReview, $inReview->fresh()->getAttributes());
        $this->assertEquals($beforeApproved, $approved->fresh()->getAttributes());
        $this->assertSame(0, $inReview->statusChanges()->count());
        $this->assertSame(0, $approved->statusChanges()->count());
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
                    ['id' => $inReview->id, 'reason' => 'not_open', 'message' => __('internal_requests.not_open_to_assign')],
                    ['id' => $deleted->id, 'reason' => 'not_found', 'message' => $message],
                ],
            ]]);
    }

    public function test_sends_one_notification_per_assumed_request_and_none_for_skipped(): void
    {
        Notification::fake();
        $analyst = User::factory()->analyst()->create();
        $first = InternalRequest::factory()->create();
        $second = InternalRequest::factory()->create();
        $skipped = InternalRequest::factory()->inReview()->create();

        $this->actingAs($analyst)
            ->postJson(self::URL, ['ids' => [$first->id, $skipped->id, $second->id, 999999]])
            ->assertOk();

        Notification::assertSentTo($first->requester, InternalRequestAssumed::class);
        Notification::assertSentTo($second->requester, InternalRequestAssumed::class);
        Notification::assertNotSentTo($skipped->requester, InternalRequestAssumed::class);
        Notification::assertSentTimes(InternalRequestAssumed::class, 2);
    }

    public function test_requester_is_forbidden_and_nothing_changes(): void
    {
        Notification::fake();
        $owner = User::factory()->create();
        $request = InternalRequest::factory()->create(['requester_id' => $owner->id]);

        $this->actingAs($owner)
            ->postJson(self::URL, ['ids' => [$request->id]])
            ->assertForbidden();

        $fresh = $request->fresh();
        $this->assertSame('open', $fresh->status->value);
        $this->assertNull($fresh->assigned_to);
        $this->assertSame(0, $request->statusChanges()->count());
        Notification::assertNotSentTo($owner, InternalRequestAssumed::class);
    }

    public function test_profile_is_checked_before_validation(): void
    {
        $this->actingAs(User::factory()->create())
            ->postJson(self::URL, [])
            ->assertForbidden();
    }

    public function test_ids_are_required(): void
    {
        $this->actingAs(User::factory()->analyst()->create());

        $this->postJson(self::URL, [])->assertUnprocessable()->assertJsonValidationErrors('ids');
        $this->postJson(self::URL, ['ids' => []])->assertUnprocessable()->assertJsonValidationErrors('ids');
    }

    public function test_more_than_100_ids_is_rejected_and_100_is_accepted(): void
    {
        $this->actingAs(User::factory()->analyst()->create());

        $this->postJson(self::URL, ['ids' => range(1, 101)])->assertUnprocessable()->assertJsonValidationErrors('ids');
        $this->postJson(self::URL, ['ids' => range(1, 100)])->assertOk()->assertJsonCount(100, 'data.skipped');
    }

    public function test_non_integer_id_is_rejected(): void
    {
        $this->actingAs(User::factory()->analyst()->create());

        $this->postJson(self::URL, ['ids' => [1, 'abc']])->assertUnprocessable()->assertJsonValidationErrors('ids.1');
        $this->postJson(self::URL, ['ids' => 'abc'])->assertUnprocessable()->assertJsonValidationErrors('ids');
    }

    public function test_repeated_id_is_rejected_and_nothing_is_assumed(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->analyst()->create())
            ->postJson(self::URL, ['ids' => [$request->id, $request->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['ids.0', 'ids.1']);

        $this->assertSame('open', $request->fresh()->status->value);
        $this->assertSame(0, $request->statusChanges()->count());
    }
}
