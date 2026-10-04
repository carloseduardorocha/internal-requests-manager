<?php

namespace Tests\Feature\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InternalRequestSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_twice_keeps_six_open_requests_with_one_history_row_each(): void
    {
        $this->seed();
        $this->seed();

        $requester = User::where('email', 'solicitante@empresa.com')->firstOrFail();

        $this->assertSame(6, InternalRequest::count());
        $this->assertSame(6, InternalRequest::where('requester_id', $requester->id)->where('status', 'open')->count());

        foreach (InternalRequest::with('statusChanges')->get() as $request) {
            $this->assertCount(1, $request->statusChanges);
            $this->assertNull($request->statusChanges[0]->from_status);
            $this->assertSame('open', $request->statusChanges[0]->to_status->value);
            $this->assertSame($request->area_id, $requester->area_id);
        }
    }
}
