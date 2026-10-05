<?php

namespace Tests\Feature\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InternalRequestSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_twice_keeps_ten_requests_with_their_full_history(): void
    {
        $this->seed();
        $this->seed();

        $requester = User::where('email', 'solicitante@empresa.com')->firstOrFail();
        $analyst = User::where('email', 'analista@empresa.com')->firstOrFail();

        $this->assertSame(10, InternalRequest::count());
        $this->assertSame(10, InternalRequest::where('requester_id', $requester->id)->count());

        foreach ([['open', 6], ['in_review', 2], ['approved', 1], ['rejected', 1]] as [$status, $total]) {
            $this->assertSame($total, InternalRequest::where('status', $status)->count(), $status);
        }

        $expected = [
            'open' => [[null, 'open']],
            'in_review' => [[null, 'open'], ['open', 'in_review']],
            'approved' => [[null, 'open'], ['open', 'in_review'], ['in_review', 'approved']],
            'rejected' => [[null, 'open'], ['open', 'in_review'], ['in_review', 'rejected']],
        ];

        foreach (InternalRequest::with('statusChanges')->get() as $request) {
            $status = $request->status->value;
            $history = $request->statusChanges->sortBy('id')->values();

            $this->assertSame($request->area_id, $requester->area_id);
            $this->assertSame(
                $expected[$status],
                $history->map(fn ($c) => [$c->from_status?->value, $c->to_status->value])->all(),
                $request->title,
            );

            if ($status === 'open') {
                $this->assertNull($request->assigned_to);
                $this->assertNull($request->decided_at);

                continue;
            }

            $this->assertSame($analyst->id, $request->assigned_to);
            $this->assertNotNull($request->assigned_at);
            $this->assertEquals($request->assigned_at, $history[1]->created_at);
            $this->assertSame($analyst->id, $history[1]->changed_by);

            if ($status === 'in_review') {
                $this->assertNull($request->decided_at);

                continue;
            }

            $this->assertSame($analyst->id, $request->decided_by);
            $this->assertNotNull($request->decision_justification);
            $this->assertEquals($request->decided_at, $history[2]->created_at);
            $this->assertTrue($request->decided_at->greaterThan($request->assigned_at));
            $this->assertTrue($request->assigned_at->greaterThan($request->created_at));
        }
    }
}
