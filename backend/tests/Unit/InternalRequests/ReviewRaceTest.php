<?php

namespace Tests\Unit\InternalRequests;

use App\Actions\InternalRequests\AssumeInternalRequest;
use App\Actions\InternalRequests\DecideInternalRequest;
use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use App\Models\InternalRequestStatusChange;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class ReviewRaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_assume_conflicts_when_status_changed_after_loading(): void
    {
        $request = InternalRequest::factory()->create();
        $stale = InternalRequest::findOrFail($request->id);
        InternalRequest::whereKey($request->id)->update(['status' => InternalRequestStatus::InReview]);

        try {
            app(AssumeInternalRequest::class)->handle($stale, User::factory()->analyst()->create());
            $this->fail('Expected ConflictHttpException.');
        } catch (ConflictHttpException) {
            $this->assertNull($request->fresh()->assigned_to);
            $this->assertSame(0, $request->statusChanges()->count());
        }
    }

    public function test_decide_conflicts_when_status_changed_after_loading(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();
        $stale = InternalRequest::findOrFail($request->id);
        InternalRequest::whereKey($request->id)->update(['status' => InternalRequestStatus::Rejected]);

        try {
            app(DecideInternalRequest::class)->handle($stale, $analyst, InternalRequestStatus::Approved, 'ok');
            $this->fail('Expected ConflictHttpException.');
        } catch (ConflictHttpException) {
            $fresh = $request->fresh();
            $this->assertSame('rejected', $fresh->status->value);
            $this->assertNull($fresh->decided_by);
            $this->assertSame(0, $request->statusChanges()->count());
        }
    }

    public function test_assume_conflicts_when_deleted_after_loading(): void
    {
        $request = InternalRequest::factory()->create();
        $stale = InternalRequest::findOrFail($request->id);
        InternalRequest::whereKey($request->id)->update(['deleted_at' => now()]);

        $this->expectException(ConflictHttpException::class);

        app(AssumeInternalRequest::class)->handle($stale, User::factory()->analyst()->create());
    }

    public function test_decide_conflicts_when_deleted_after_loading(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();
        $stale = InternalRequest::findOrFail($request->id);
        InternalRequest::whereKey($request->id)->update(['deleted_at' => now()]);

        try {
            app(DecideInternalRequest::class)->handle($stale, $analyst, InternalRequestStatus::Approved, 'ok');
            $this->fail('Expected ConflictHttpException.');
        } catch (ConflictHttpException) {
            $fresh = InternalRequest::withTrashed()->findOrFail($request->id);
            $this->assertSame('in_review', $fresh->status->value);
            $this->assertNull($fresh->decided_by);
            $this->assertSame(0, $request->statusChanges()->count());
        }
    }

    public function test_decide_with_a_non_decision_status_is_a_programming_error(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();

        foreach ([InternalRequestStatus::Open, InternalRequestStatus::InReview] as $target) {
            try {
                app(DecideInternalRequest::class)->handle($request, $analyst, $target, 'ok');
                $this->fail('Expected InvalidArgumentException.');
            } catch (InvalidArgumentException) {
            }
        }

        $fresh = $request->fresh();
        $this->assertSame('in_review', $fresh->status->value);
        $this->assertNull($fresh->decided_at);
        $this->assertSame(0, $request->statusChanges()->count());
    }

    public function test_status_change_is_rolled_back_when_the_history_fails(): void
    {
        $analyst = User::factory()->analyst()->create();
        $open = InternalRequest::factory()->create();
        $inReview = InternalRequest::factory()->inReview($analyst)->create();

        InternalRequestStatusChange::creating(fn () => throw new RuntimeException('history failed'));

        foreach ([
            fn () => app(AssumeInternalRequest::class)->handle($open, $analyst),
            fn () => app(DecideInternalRequest::class)->handle($inReview, $analyst, InternalRequestStatus::Approved, 'ok'),
        ] as $run) {
            try {
                $run();
                $this->fail('Expected RuntimeException.');
            } catch (RuntimeException $e) {
                $this->assertSame('history failed', $e->getMessage());
            }
        }

        $this->assertSame('open', $open->fresh()->status->value);
        $this->assertNull($open->fresh()->assigned_to);
        $this->assertSame('in_review', $inReview->fresh()->status->value);
        $this->assertNull($inReview->fresh()->decided_at);
    }
}
