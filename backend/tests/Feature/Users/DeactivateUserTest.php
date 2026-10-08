<?php

namespace Tests\Feature\Users;

use App\Actions\Users\DeactivateUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DeactivateUserTest extends TestCase
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

        $this->postJson("/api/users/{$user->id}/deactivate")->assertUnauthorized();
        $this->postJson("/api/users/{$user->id}/reactivate")->assertUnauthorized();
    }

    public function test_requester_and_analyst_cannot_deactivate_or_reactivate(): void
    {
        $active = User::factory()->create();
        $off = User::factory()->deactivated()->create();

        foreach ([User::factory()->create(), User::factory()->analyst()->create()] as $user) {
            $this->actingAs($user)->postJson("/api/users/{$active->id}/deactivate")->assertForbidden();
            $this->actingAs($user)->postJson("/api/users/{$off->id}/reactivate")->assertForbidden();
        }

        $this->assertNull($active->fresh()->deactivated_at);
        $this->assertNotNull($off->fresh()->deactivated_at);
    }

    public function test_unknown_account_is_not_found(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/users/999999/deactivate')->assertNotFound();
        $this->actingAs($admin)->postJson('/api/users/999999/reactivate')->assertNotFound();
    }

    public function test_admin_deactivates_and_reactivates_an_account(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();

        $this->actingAs($admin)->postJson("/api/users/{$target->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.id', $target->id)
            ->assertJsonPath('data.status', 'deactivated')
            ->assertJsonPath('data.can.deactivate', false)
            ->assertJsonPath('data.can.reactivate', true);
        $this->assertNotNull($target->fresh()->deactivated_at);

        $this->actingAs($admin)->postJson("/api/users/{$target->id}/reactivate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.deactivated_at', null)
            ->assertJsonPath('data.can.deactivate', true)
            ->assertJsonPath('data.can.reactivate', false);
        $this->assertNull($target->fresh()->deactivated_at);
    }

    public function test_the_admin_cannot_deactivate_the_own_account(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson("/api/users/{$admin->id}/deactivate")
            ->assertForbidden()
            ->assertJsonPath('message', 'Você não pode desativar a própria conta.');

        $this->assertNull($admin->fresh()->deactivated_at);
    }

    public function test_repeating_the_action_answers_ok_and_changes_nothing(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();

        $this->actingAs($admin)->postJson("/api/users/{$target->id}/reactivate")->assertOk()->assertJsonPath('data.status', 'active');
        $this->assertNull($target->fresh()->deactivated_at);

        $this->actingAs($admin)->postJson("/api/users/{$target->id}/deactivate")->assertOk();
        $first = $target->fresh()->deactivated_at;

        $this->travel(1)->hours();
        $this->actingAs($admin)->postJson("/api/users/{$target->id}/deactivate")->assertOk()->assertJsonPath('data.status', 'deactivated');
        $this->assertEquals($first, $target->fresh()->deactivated_at);

        $this->actingAs($admin)->postJson("/api/users/{$target->id}/reactivate")->assertOk();
        $this->actingAs($admin)->postJson("/api/users/{$target->id}/reactivate")->assertOk()->assertJsonPath('data.status', 'active');
        $this->assertNull($target->fresh()->deactivated_at);
    }

    public function test_deactivating_deletes_the_sessions_of_the_account_and_rotates_the_remember_token(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();
        $other = User::factory()->create();
        $oldToken = $target->remember_token;
        $this->sessionRow($target, 'target-1');
        $this->sessionRow($target, 'target-2');
        $this->sessionRow($other, 'other-1');

        $this->actingAs($admin)->postJson("/api/users/{$target->id}/deactivate")->assertOk();

        $this->assertDatabaseMissing('sessions', ['user_id' => $target->id]);
        $this->assertDatabaseHas('sessions', ['id' => 'other-1', 'user_id' => $other->id]);
        $this->assertNotSame($oldToken, $target->fresh()->remember_token);
        $this->assertSame($other->remember_token, $other->fresh()->remember_token);
    }

    public function test_a_logged_in_person_gets_401_right_after_the_deactivation(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create(['email' => 'ana@empresa.com']);

        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])->assertOk();
        $this->getJson('/api/me')->assertOk();

        app(DeactivateUser::class)->handle($target);
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_the_middleware_answers_401_even_if_the_session_row_still_exists(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Deactivated straight in the database, so nothing deleted the session.
        $user->forceFill(['deactivated_at' => now()])->saveQuietly();

        $this->getJson('/api/me')->assertUnauthorized();
        $this->postJson('/api/internal-requests', ['title' => 'a', 'description' => 'b', 'priority' => 'low'])->assertUnauthorized();
        $this->assertDatabaseCount('internal_requests', 0);
    }

    public function test_the_middleware_also_refuses_a_deactivated_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();
        $this->actingAs($admin);
        $admin->forceFill(['deactivated_at' => now()])->saveQuietly();

        $this->getJson('/api/users')->assertUnauthorized();
        $this->postJson("/api/users/{$target->id}/deactivate")->assertUnauthorized();
        $this->assertNull($target->fresh()->deactivated_at);
    }

    public function test_the_remember_cookie_stops_working_after_the_deactivation(): void
    {
        $target = User::factory()->create(['email' => 'ana@empresa.com']);

        $login = $this->postJson('/api/login', [
            'email' => 'ana@empresa.com',
            'password' => 'password',
            'remember' => true,
        ])->assertOk();

        $cookie = collect($login->headers->getCookies())
            ->first(fn ($c) => str_starts_with($c->getName(), 'remember_web_'));
        $this->assertNotNull($cookie);

        // Positive control: the cookie alone (no session) authenticates before the deactivation.
        $this->app['auth']->forgetGuards();
        $this->flushSession();
        $this->withCredentials()->withUnencryptedCookie($cookie->getName(), $cookie->getValue())
            ->getJson('/api/me')
            ->assertOk();

        app(DeactivateUser::class)->handle($target);

        $this->app['auth']->forgetGuards();
        $this->flushSession();
        $this->withCredentials()->withUnencryptedCookie($cookie->getName(), $cookie->getValue())
            ->getJson('/api/me')
            ->assertUnauthorized();
    }
}
