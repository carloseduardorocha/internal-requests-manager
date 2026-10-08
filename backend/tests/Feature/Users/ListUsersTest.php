<?php

namespace Tests\Feature\Users;

use App\Models\Area;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListUsersTest extends TestCase
{
    use RefreshDatabase;

    public function test_without_session_is_unauthorized(): void
    {
        $this->getJson('/api/users')->assertUnauthorized();
    }

    public function test_requester_and_analyst_cannot_list(): void
    {
        foreach ([User::factory()->create(), User::factory()->analyst()->create()] as $user) {
            $this->actingAs($user)->getJson('/api/users')->assertForbidden();
        }
    }

    public function test_admin_lists_accounts_with_status_and_can_flags(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Ana Admin']);
        $active = User::factory()->create(['name' => 'Bruno Ativo']);
        $off = User::factory()->create(['name' => 'Carla Inativa', 'deactivated_at' => '2026-10-06 14:00:00']);

        $response = $this->actingAs($admin)->getJson('/api/users')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [['id', 'name', 'email', 'role', 'area' => ['id', 'name'], 'status', 'deactivated_at', 'created_at',
                    'can' => ['update', 'change_role', 'deactivate', 'reactivate']]],
                'links', 'meta',
            ]);

        $rows = collect($response->json('data'))->keyBy('id');

        $this->assertSame('active', $rows[$active->id]['status']);
        $this->assertNull($rows[$active->id]['deactivated_at']);
        $this->assertSame(
            ['update' => true, 'change_role' => true, 'deactivate' => true, 'reactivate' => false],
            $rows[$active->id]['can'],
        );

        $this->assertSame('deactivated', $rows[$off->id]['status']);
        $this->assertNotNull($rows[$off->id]['deactivated_at']);
        $this->assertSame(
            ['update' => true, 'change_role' => true, 'deactivate' => false, 'reactivate' => true],
            $rows[$off->id]['can'],
        );
    }

    public function test_the_own_account_cannot_change_role_or_be_deactivated(): void
    {
        $admin = User::factory()->admin()->create();

        $row = collect($this->actingAs($admin)->getJson('/api/users')->assertOk()->json('data'))
            ->firstWhere('id', $admin->id);

        $this->assertSame(
            ['update' => true, 'change_role' => false, 'deactivate' => false, 'reactivate' => false],
            $row['can'],
        );
    }

    public function test_the_list_is_ordered_by_name_and_paginated(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Ana']);
        User::factory()->create(['name' => 'Carlos']);
        User::factory()->create(['name' => 'Bruno']);

        $this->actingAs($admin)->getJson('/api/users')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Ana')
            ->assertJsonPath('data.1.name', 'Bruno')
            ->assertJsonPath('data.2.name', 'Carlos')
            ->assertJsonPath('meta.per_page', 15);

        $this->actingAs($admin)->getJson('/api/users?per_page=2&page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Carlos')
            ->assertJsonPath('meta.total', 3);
    }

    public function test_search_matches_part_of_the_name_or_of_the_email(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Zeca', 'email' => 'zeca@empresa.com']);
        $byName = User::factory()->create(['name' => 'Fernanda Souza', 'email' => 'x1@empresa.com']);
        $byEmail = User::factory()->create(['name' => 'Outro Nome', 'email' => 'fernando.silva@empresa.com']);
        User::factory()->create(['name' => 'Nada Ver', 'email' => 'nada@empresa.com']);

        $ids = collect($this->actingAs($admin)->getJson('/api/users?search=fern')->assertOk()->json('data'))->pluck('id');

        $this->assertEqualsCanonicalizing([$byName->id, $byEmail->id], $ids->all());
    }

    public function test_search_treats_wildcards_as_plain_text(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Zeca', 'email' => 'zeca@empresa.com']);
        $percent = User::factory()->create(['name' => '100% Ana', 'email' => 'a1@empresa.com']);
        $underscore = User::factory()->create(['name' => 'Ana', 'email' => 'ana_dev@empresa.com']);
        User::factory()->create(['name' => 'Bia', 'email' => 'anaxdev@empresa.com']);

        $this->actingAs($admin)->getJson('/api/users?search=%25')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $percent->id);

        $this->actingAs($admin)->getJson('/api/users?search=a_d')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $underscore->id);
    }

    public function test_filters_by_role_area_and_status_alone_and_combined(): void
    {
        $finance = Area::factory()->create();
        $hr = Area::factory()->create();
        $admin = User::factory()->admin()->create(['area_id' => $hr->id]);
        $analystFinance = User::factory()->analyst()->create(['area_id' => $finance->id]);
        $analystOff = User::factory()->analyst()->deactivated()->create(['area_id' => $finance->id]);
        $requesterHr = User::factory()->create(['area_id' => $hr->id]);

        $ids = fn (string $query) => collect($this->actingAs($admin)->getJson("/api/users?{$query}")->assertOk()->json('data'))
            ->pluck('id')->all();

        $this->assertEqualsCanonicalizing([$analystFinance->id, $analystOff->id], $ids('role=analyst'));
        $this->assertEqualsCanonicalizing([$analystFinance->id, $analystOff->id], $ids("area_id={$finance->id}"));
        $this->assertSame([$analystOff->id], $ids('status=deactivated'));
        $this->assertEqualsCanonicalizing([$admin->id, $analystFinance->id, $requesterHr->id], $ids('status=active'));
        $this->assertSame([$analystFinance->id], $ids("role=analyst&area_id={$finance->id}&status=active"));
        $this->assertSame([], $ids("role=requester&area_id={$finance->id}"));
    }

    public function test_empty_parameters_are_ignored(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create();

        $this->actingAs($admin)->getJson('/api/users?search=&role=&area_id=&status=&per_page=')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_invalid_filters_are_rejected(): void
    {
        $admin = User::factory()->admin()->create();

        foreach (['role=boss', 'status=gone', 'area_id=999999', 'area_id=abc', 'per_page=101', 'per_page=0'] as $query) {
            $this->actingAs($admin)->getJson("/api/users?{$query}")->assertUnprocessable();
        }

        $this->actingAs($admin)->getJson('/api/users?per_page=100')->assertOk();
    }
}
