<?php

namespace Tests\Feature\Invitations;

use App\Models\Area;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AreaListTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_lists_areas_ordered_by_name(): void
    {
        $admin = User::factory()->admin()->create();
        $ti = Area::factory()->create(['name' => 'TI']);
        $compras = Area::factory()->create(['name' => 'Compras']);
        $rh = Area::factory()->create(['name' => 'RH']);

        $response = $this->actingAs($admin)
            ->getJson('/api/areas')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name']]]);

        $names = collect($response->json('data'))->pluck('name');
        $this->assertSame($names->sort(SORT_STRING | SORT_FLAG_CASE)->values()->all(), $names->all());
        $this->assertSame(Area::count(), $names->count());
        $this->assertContains(['id' => $compras->id, 'name' => 'Compras'], $response->json('data'));
        $this->assertContains(['id' => $rh->id, 'name' => 'RH'], $response->json('data'));
        $this->assertContains(['id' => $ti->id, 'name' => 'TI'], $response->json('data'));
    }

    public function test_requester_and_analyst_get_403(): void
    {
        $this->actingAs(User::factory()->create())->getJson('/api/areas')->assertForbidden();
        $this->actingAs(User::factory()->analyst()->create())->getJson('/api/areas')->assertForbidden();
    }

    public function test_guest_gets_401(): void
    {
        $this->getJson('/api/areas')->assertUnauthorized();
    }
}
