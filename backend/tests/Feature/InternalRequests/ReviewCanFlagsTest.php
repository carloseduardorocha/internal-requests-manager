<?php

namespace Tests\Feature\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewCanFlagsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The assign, approve and reject flags, in that order.
     *
     * @return array<int, bool>
     */
    private function flags(User $user, InternalRequest $request): array
    {
        $can = $this->actingAs($user)->getJson("/api/internal-requests/{$request->id}")->assertOk()->json('data.can');

        return [$can['assign'], $can['approve'], $can['reject']];
    }

    public function test_open_request_can_only_be_assumed_by_analyst_and_admin(): void
    {
        $owner = User::factory()->create();
        $request = InternalRequest::factory()->create(['requester_id' => $owner->id]);

        $this->assertSame([true, false, false], $this->flags(User::factory()->analyst()->create(), $request));
        $this->assertSame([true, false, false], $this->flags(User::factory()->admin()->create(), $request));
        $this->assertSame([false, false, false], $this->flags($owner, $request));
    }

    public function test_in_review_request_can_be_decided_by_who_assumed_and_admin(): void
    {
        $analyst = User::factory()->analyst()->create();
        $request = InternalRequest::factory()->inReview($analyst)->create();

        $this->assertSame([false, true, true], $this->flags($analyst, $request));
        $this->assertSame([false, true, true], $this->flags(User::factory()->admin()->create(), $request));
        $this->assertSame([false, false, false], $this->flags(User::factory()->analyst()->create(), $request));
        $this->assertSame([false, false, false], $this->flags($request->requester, $request));
    }

    public function test_decided_request_has_every_flag_false(): void
    {
        foreach (['approved', 'rejected'] as $state) {
            $analyst = User::factory()->analyst()->create();
            $request = InternalRequest::factory()->{$state}($analyst)->create();

            $this->assertSame([false, false, false], $this->flags($analyst, $request));
            $this->assertSame([false, false, false], $this->flags(User::factory()->admin()->create(), $request));
        }
    }

    public function test_flags_also_appear_in_the_listing(): void
    {
        InternalRequest::factory()->create();

        $this->actingAs(User::factory()->analyst()->create())
            ->getJson('/api/internal-requests')
            ->assertOk()
            ->assertJsonPath('data.0.can.assign', true)
            ->assertJsonPath('data.0.can.approve', false)
            ->assertJsonPath('data.0.can.reject', false);
    }
}
