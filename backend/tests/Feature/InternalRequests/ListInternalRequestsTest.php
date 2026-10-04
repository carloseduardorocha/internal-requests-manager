<?php

namespace Tests\Feature\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ListInternalRequestsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<int, int>
     */
    private function ids(array $query, User $user): array
    {
        $response = $this->actingAs($user)->getJson('/api/internal-requests?'.http_build_query($query))->assertOk();

        return array_column($response->json('data'), 'id');
    }

    public function test_without_session_is_unauthorized(): void
    {
        $this->getJson('/api/internal-requests')->assertUnauthorized();
    }

    public function test_requester_sees_only_their_own_requests(): void
    {
        $me = User::factory()->create();
        $mine = InternalRequest::factory()->count(2)->create(['requester_id' => $me->id]);
        InternalRequest::factory()->count(3)->create();

        $this->assertEqualsCanonicalizing($mine->pluck('id')->all(), $this->ids([], $me));
    }

    public function test_analyst_and_admin_see_all_requests(): void
    {
        $all = InternalRequest::factory()->count(4)->create();

        foreach ([User::factory()->analyst()->create(), User::factory()->admin()->create()] as $user) {
            $this->assertEqualsCanonicalizing($all->pluck('id')->all(), $this->ids([], $user));
        }
    }

    public function test_response_is_paginated_and_does_not_include_history(): void
    {
        $user = User::factory()->admin()->create();
        InternalRequest::factory()->count(3)->create();

        $this->actingAs($user)
            ->getJson('/api/internal-requests')
            ->assertOk()
            ->assertJsonStructure(['data', 'links', 'meta'])
            ->assertJsonMissingPath('data.0.history');
    }

    public function test_search_matches_title_and_description(): void
    {
        $user = User::factory()->admin()->create();
        $byTitle = InternalRequest::factory()->create(['title' => 'Compra de monitor', 'description' => 'abc']);
        $byDescription = InternalRequest::factory()->create(['title' => 'Outro', 'description' => 'Preciso de um monitor']);
        InternalRequest::factory()->create(['title' => 'Cadeira', 'description' => 'quebrada']);

        $this->assertEqualsCanonicalizing(
            [$byTitle->id, $byDescription->id],
            $this->ids(['search' => 'monitor'], $user),
        );
    }

    public function test_search_treats_percent_and_underscore_as_plain_text(): void
    {
        $user = User::factory()->admin()->create();
        $percent = InternalRequest::factory()->create(['title' => 'Desconto de 50% hoje']);
        $underscore = InternalRequest::factory()->create(['title' => 'campo_nome']);
        InternalRequest::factory()->create(['title' => 'Qualquer coisa', 'description' => 'texto']);
        InternalRequest::factory()->create(['title' => 'campoXnome', 'description' => 'texto']);

        $this->assertSame([$percent->id], $this->ids(['search' => '%'], $user));
        $this->assertSame([$underscore->id], $this->ids(['search' => '_'], $user));
    }

    public function test_empty_search_is_ignored(): void
    {
        $user = User::factory()->admin()->create();
        $all = InternalRequest::factory()->count(3)->create();

        $this->actingAs($user)->getJson('/api/internal-requests?search=')->assertOk()->assertJsonCount(3, 'data');
        $this->assertEqualsCanonicalizing($all->pluck('id')->all(), $this->ids(['search' => ''], $user));
    }

    public function test_search_does_not_leak_other_peoples_requests_to_requesters(): void
    {
        $me = User::factory()->create();
        $mine = InternalRequest::factory()->create(['requester_id' => $me->id, 'title' => 'Teclado']);
        InternalRequest::factory()->create(['title' => 'Teclado']);

        $this->assertSame([$mine->id], $this->ids(['search' => 'Teclado'], $me));
    }

    public function test_filters_by_status_and_priority(): void
    {
        $user = User::factory()->admin()->create();
        $open = InternalRequest::factory()->create(['priority' => 'low']);
        $review = InternalRequest::factory()->inReview()->create(['priority' => 'high']);
        $approved = InternalRequest::factory()->approved()->create(['priority' => 'high']);

        $this->assertSame([$open->id], $this->ids(['status' => 'open'], $user));
        $this->assertSame([$review->id], $this->ids(['status' => 'in_review'], $user));
        $this->assertSame([$approved->id], $this->ids(['status' => 'approved'], $user));
        $this->assertSame([], $this->ids(['status' => 'rejected'], $user));
        $this->assertSame([$open->id], $this->ids(['priority' => 'low'], $user));
        $this->assertEqualsCanonicalizing([$review->id, $approved->id], $this->ids(['priority' => 'high'], $user));
        $this->assertSame([$approved->id], $this->ids(['priority' => 'high', 'status' => 'approved'], $user));
    }

    public function test_default_order_is_newest_first_and_sort_created_at_reverses_it(): void
    {
        $user = User::factory()->admin()->create();
        $old = InternalRequest::factory()->create(['created_at' => now()->subDays(3)]);
        $mid = InternalRequest::factory()->create(['created_at' => now()->subDays(2)]);
        $new = InternalRequest::factory()->create(['created_at' => now()->subDay()]);

        $this->assertSame([$new->id, $mid->id, $old->id], $this->ids([], $user));
        $this->assertSame([$new->id, $mid->id, $old->id], $this->ids(['sort' => '-created_at'], $user));
        $this->assertSame([$old->id, $mid->id, $new->id], $this->ids(['sort' => 'created_at'], $user));
    }

    public function test_per_page_and_page_paginate_the_results(): void
    {
        $user = User::factory()->admin()->create();
        InternalRequest::factory()->count(5)->create();

        $this->actingAs($user)->getJson('/api/internal-requests')->assertOk()->assertJsonCount(5, 'data');

        $this->actingAs($user)
            ->getJson('/api/internal-requests?per_page=2&page=3')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.current_page', 3);

        $this->actingAs($user)->getJson('/api/internal-requests?per_page=100')->assertOk();
    }

    public function test_invalid_filters_are_rejected(): void
    {
        $user = User::factory()->admin()->create();

        foreach ([
            'status' => 'foo',
            'priority' => 'foo',
            'sort' => 'foo',
            'per_page' => 101,
        ] as $field => $value) {
            $this->actingAs($user)
                ->getJson("/api/internal-requests?{$field}={$value}")
                ->assertUnprocessable()
                ->assertJsonValidationErrors([$field]);
        }

        $this->actingAs($user)->getJson('/api/internal-requests?per_page=0')->assertUnprocessable();
    }

    public function test_deleted_requests_are_not_listed(): void
    {
        $user = User::factory()->admin()->create();
        $kept = InternalRequest::factory()->create();
        InternalRequest::factory()->create(['deleted_at' => now(), 'deleted_by' => $user->id]);

        $this->assertSame([$kept->id], $this->ids([], $user));
    }

    public function test_list_items_carry_can_flags(): void
    {
        $me = User::factory()->create();
        InternalRequest::factory()->create(['requester_id' => $me->id]);

        $this->actingAs($me)
            ->getJson('/api/internal-requests')
            ->assertJsonPath('data.0.can.update', true)
            ->assertJsonPath('data.0.can.delete', true);
    }

    public function test_requester_email_is_not_exposed(): void
    {
        $request = InternalRequest::factory()->create();

        $this->actingAs(User::factory()->analyst()->create())
            ->getJson('/api/internal-requests')
            ->assertOk()
            ->assertJsonPath('data.0.requester.id', $request->requester_id)
            ->assertJsonMissingPath('data.0.requester.email');
    }

    public function test_empty_filters_fall_back_to_defaults(): void
    {
        $old = InternalRequest::factory()->create(['created_at' => now()->subDay()]);
        $new = InternalRequest::factory()->create(['created_at' => now()]);

        $response = $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/internal-requests?status=&priority=&sort=&per_page=')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 15);

        $this->assertSame([$new->id, $old->id], array_column($response->json('data'), 'id'));
    }

    public function test_listing_does_not_run_more_queries_with_more_requests(): void
    {
        $admin = User::factory()->admin()->create();
        InternalRequest::factory()->approved()->count(3)->create();

        $countQueries = function () use ($admin): int {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actingAs($admin)->getJson('/api/internal-requests')->assertOk();
            $count = count(DB::getQueryLog());
            DB::disableQueryLog();

            return $count;
        };

        $before = $countQueries();
        InternalRequest::factory()->approved()->count(7)->create();

        $this->assertSame($before, $countQueries());
    }
}
