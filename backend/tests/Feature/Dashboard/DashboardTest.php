<?php

namespace Tests\Feature\Dashboard;

use App\Enums\InternalRequestPriority;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function seedKnownData(): void
    {
        $low = ['priority' => InternalRequestPriority::Low];
        $medium = ['priority' => InternalRequestPriority::Medium];
        $high = ['priority' => InternalRequestPriority::High];

        InternalRequest::factory()->count(2)->create($low);
        InternalRequest::factory()->create($high);
        InternalRequest::factory()->count(3)->inReview()->create($medium);
        InternalRequest::factory()->approved()->create($high);
        InternalRequest::factory()->count(2)->rejected()->create($low);
    }

    /**
     * @return array<string, mixed>
     */
    private function expected(): array
    {
        return [
            'total' => 9,
            'by_status' => ['open' => 3, 'in_review' => 3, 'approved' => 1, 'rejected' => 2],
            'by_priority' => ['low' => 4, 'medium' => 3, 'high' => 2],
        ];
    }

    public function test_without_session_is_unauthorized(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
    }

    public function test_requester_is_forbidden(): void
    {
        $this->actingAs(User::factory()->create())->getJson('/api/dashboard')->assertForbidden();
    }

    public function test_numbers_match_the_database(): void
    {
        $this->seedKnownData();

        $response = $this->actingAs(User::factory()->analyst()->create())
            ->getJson('/api/dashboard')
            ->assertOk();

        $this->assertSame($this->expected(), $response->json());
    }

    public function test_analyst_and_admin_get_the_same_numbers(): void
    {
        $this->seedKnownData();

        foreach ([User::factory()->analyst()->create(), User::factory()->admin()->create()] as $user) {
            $response = $this->actingAs($user)->getJson('/api/dashboard')->assertOk();

            $this->assertSame($this->expected(), $response->json());
        }
    }

    public function test_deleted_requests_are_not_counted(): void
    {
        $this->seedKnownData();
        InternalRequest::factory()->count(2)->create()->each->delete();
        InternalRequest::factory()->approved()->create(['priority' => InternalRequestPriority::High])->delete();

        $response = $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/dashboard')
            ->assertOk();

        $this->assertSame($this->expected(), $response->json());
    }

    public function test_empty_database_returns_all_keys_with_zero(): void
    {
        $response = $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonMissingPath('data');

        $this->assertSame([
            'total' => 0,
            'by_status' => ['open' => 0, 'in_review' => 0, 'approved' => 0, 'rejected' => 0],
            'by_priority' => ['low' => 0, 'medium' => 0, 'high' => 0],
        ], $response->json());
    }
}
