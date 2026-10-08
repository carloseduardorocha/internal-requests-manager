<?php

namespace Tests\Feature\Users;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class BulkUserStatusTest extends TestCase
{
    use RefreshDatabase;

    private function sessionRow(User $user, string $id): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
            'payload' => 'x',
            'last_activity' => time(),
        ]);
    }

    public function test_without_session_is_unauthorized(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/users/bulk/deactivate', ['ids' => [$user->id]])->assertUnauthorized();
        $this->postJson('/api/users/bulk/reactivate', ['ids' => [$user->id]])->assertUnauthorized();
        $this->assertNull($user->fresh()->deactivated_at);
    }

    public function test_requester_and_analyst_get_403_on_both_routes_and_nothing_changes(): void
    {
        $active = User::factory()->create();
        $off = User::factory()->deactivated()->create();
        $offAt = $off->fresh()->deactivated_at;

        foreach ([User::factory()->create(), User::factory()->analyst()->create()] as $user) {
            $this->actingAs($user)->postJson('/api/users/bulk/deactivate', ['ids' => [$active->id]])->assertForbidden();
            $this->actingAs($user)->postJson('/api/users/bulk/reactivate', ['ids' => [$off->id]])->assertForbidden();
        }

        $this->assertNull($active->fresh()->deactivated_at);
        $this->assertEquals($offAt, $off->fresh()->deactivated_at);
    }

    public function test_admin_deactivates_a_batch_and_skips_the_own_account_with_the_reason(): void
    {
        $admin = User::factory()->admin()->create();
        $other = User::factory()->create();

        $this->actingAs($admin)->postJson('/api/users/bulk/deactivate', ['ids' => [$admin->id, $other->id]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [$other->id],
                'skipped' => [[
                    'id' => $admin->id,
                    'reason' => 'self',
                    'message' => 'Você não pode desativar a própria conta.',
                ]],
            ]]);

        $this->assertNull($admin->fresh()->deactivated_at);
        $this->assertNotNull($other->fresh()->deactivated_at);
    }

    public function test_deactivating_deletes_sessions_and_rotates_the_remember_token(): void
    {
        $admin = User::factory()->admin()->create();
        $a = User::factory()->create();
        $b = User::factory()->analyst()->create();
        $untouched = User::factory()->create();
        $oldA = $a->remember_token;
        $oldB = $b->remember_token;
        $this->sessionRow($a, 'a-1');
        $this->sessionRow($a, 'a-2');
        $this->sessionRow($b, 'b-1');
        $this->sessionRow($untouched, 'u-1');

        $this->actingAs($admin)->postJson('/api/users/bulk/deactivate', ['ids' => [$a->id, $b->id]])
            ->assertOk()
            ->assertJsonPath('data.done', [$a->id, $b->id]);

        $this->assertDatabaseMissing('sessions', ['user_id' => $a->id]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $b->id]);
        $this->assertDatabaseHas('sessions', ['id' => 'u-1', 'user_id' => $untouched->id]);
        $this->assertNotSame($oldA, $a->fresh()->remember_token);
        $this->assertNotSame($oldB, $b->fresh()->remember_token);
        $this->assertSame($untouched->remember_token, $untouched->fresh()->remember_token);
    }

    public function test_a_logged_in_person_gets_401_right_after_the_batch(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create(['email' => 'ana@empresa.com']);

        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])->assertOk();
        $this->getJson('/api/me')->assertOk();

        // The admin acts in a separate call: the batch runs, then the person's session is gone.
        $this->app['auth']->forgetGuards();
        $this->actingAs($admin)->postJson('/api/users/bulk/deactivate', ['ids' => [$target->id]])->assertOk();

        $this->actingAs($target->fresh())->getJson('/api/me')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->flushSession();
        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])->assertUnprocessable();
    }

    public function test_mixed_deactivate_batch_keeps_the_order_and_does_not_touch_deactivated_accounts(): void
    {
        $admin = User::factory()->admin()->create();
        $active1 = User::factory()->create();
        $off = User::factory()->deactivated()->create();
        $active2 = User::factory()->create();
        $offAt = $off->fresh()->deactivated_at;
        $offToken = $off->fresh()->remember_token;

        $this->travel(2)->hours();

        $this->actingAs($admin)->postJson('/api/users/bulk/deactivate', ['ids' => [$active2->id, $off->id, $active1->id]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [$active2->id, $active1->id],
                'skipped' => [[
                    'id' => $off->id,
                    'reason' => 'already_deactivated',
                    'message' => 'A conta já está desativada.',
                ]],
            ]]);

        $this->assertEquals($offAt, $off->fresh()->deactivated_at);
        $this->assertSame($offToken, $off->fresh()->remember_token);
        $this->assertNotNull($active1->fresh()->deactivated_at);
        $this->assertNotNull($active2->fresh()->deactivated_at);
    }

    public function test_mixed_reactivate_batch_keeps_the_order_and_skips_active_accounts(): void
    {
        $admin = User::factory()->admin()->create();
        $off1 = User::factory()->deactivated()->create();
        $active = User::factory()->create();
        $off2 = User::factory()->deactivated()->create();

        $this->actingAs($admin)->postJson('/api/users/bulk/reactivate', ['ids' => [$off2->id, $active->id, $off1->id]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [$off2->id, $off1->id],
                'skipped' => [[
                    'id' => $active->id,
                    'reason' => 'already_active',
                    'message' => 'A conta já está ativa.',
                ]],
            ]]);

        $this->assertNull($off1->fresh()->deactivated_at);
        $this->assertNull($off2->fresh()->deactivated_at);
        $this->assertNull($active->fresh()->deactivated_at);
    }

    public function test_reactivate_with_the_own_account_falls_into_already_active(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/users/bulk/reactivate', ['ids' => [$admin->id]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [],
                'skipped' => [[
                    'id' => $admin->id,
                    'reason' => 'already_active',
                    'message' => 'A conta já está ativa.',
                ]],
            ]]);
    }

    public function test_reactivating_gives_the_access_back_with_the_same_password(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create(['email' => 'ana@empresa.com']);

        $this->actingAs($admin)->postJson('/api/users/bulk/deactivate', ['ids' => [$target->id]])->assertOk();
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])->assertUnprocessable();

        $this->actingAs($admin)->postJson('/api/users/bulk/reactivate', ['ids' => [$target->id]])
            ->assertOk()
            ->assertJsonPath('data.done', [$target->id]);
        $this->assertNull($target->fresh()->deactivated_at);

        $this->app['auth']->forgetGuards();
        $this->flushSession();
        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])->assertOk();
    }

    public function test_unknown_id_is_skipped_as_not_found_and_the_rest_goes_on(): void
    {
        $admin = User::factory()->admin()->create();
        $active = User::factory()->create();
        $off = User::factory()->deactivated()->create();

        $this->actingAs($admin)->postJson('/api/users/bulk/deactivate', ['ids' => [999999, $active->id]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [$active->id],
                'skipped' => [[
                    'id' => 999999,
                    'reason' => 'not_found',
                    'message' => 'Conta não encontrada.',
                ]],
            ]]);
        $this->assertNotNull($active->fresh()->deactivated_at);

        $this->actingAs($admin)->postJson('/api/users/bulk/reactivate', ['ids' => [$off->id, 999998]])
            ->assertOk()
            ->assertExactJson(['data' => [
                'done' => [$off->id],
                'skipped' => [[
                    'id' => 999998,
                    'reason' => 'not_found',
                    'message' => 'Conta não encontrada.',
                ]],
            ]]);
        $this->assertNull($off->fresh()->deactivated_at);
    }

    public function test_the_bulk_route_is_not_taken_by_the_single_account_route(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();

        $this->actingAs($admin)->postJson('/api/users/bulk/deactivate', ['ids' => [$target->id]])
            ->assertOk()
            ->assertJsonStructure(['data' => ['done', 'skipped']]);
    }

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    public static function invalidPayloads(): array
    {
        return [
            'missing ids' => [[]],
            'empty ids' => [['ids' => []]],
            'more than 100 ids' => [['ids' => range(1, 101)]],
            'non integer id' => [['ids' => [1, 'abc']]],
            'decimal id' => [['ids' => [1, 1.5]]],
            'repeated id' => [['ids' => [1, 2, 1]]],
            'ids is not a list' => [['ids' => 'abc']],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    #[DataProvider('invalidPayloads')]
    public function test_invalid_payload_is_unprocessable_on_both_routes(array $payload): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();
        $off = User::factory()->deactivated()->create();

        foreach (['deactivate', 'reactivate'] as $action) {
            $response = $this->actingAs($admin)->postJson("/api/users/bulk/{$action}", $payload)->assertUnprocessable();

            $keys = array_keys($response->json('errors'));
            $this->assertNotEmpty($keys);
            foreach ($keys as $key) {
                $this->assertStringStartsWith('ids', $key);
            }
        }

        $this->assertNull($target->fresh()->deactivated_at);
        $this->assertNotNull($off->fresh()->deactivated_at);
    }

    public function test_exactly_100_ids_are_accepted(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->postJson('/api/users/bulk/reactivate', ['ids' => range(900001, 900100)])
            ->assertOk();

        $this->assertCount(100, $response->json('data.skipped'));
        $this->assertSame([], $response->json('data.done'));
    }
}
