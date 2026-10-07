<?php

namespace Tests\Feature\Invitations;

use App\Enums\Role;
use App\Models\Area;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AcceptInvitationTest extends TestCase
{
    use RefreshDatabase;

    private const MESSAGE = 'Este convite expirou ou já foi usado. Peça um novo convite ao administrador.';

    /**
     * @return array<string, string>
     */
    private function password(string $value = 'segredo123'): array
    {
        return ['password' => $value, 'password_confirmation' => $value];
    }

    public function test_account_is_created_from_the_invitation_and_the_user_is_logged_in(): void
    {
        $area = Area::factory()->create(['name' => 'Financeiro']);
        [$invitation, $token] = Invitation::factory()->createWithToken([
            'name' => 'Maria Nova',
            'email' => 'maria@empresa.com',
            'role' => Role::Analyst,
            'area_id' => $area->id,
        ]);

        $response = $this->postJson("/api/invitations/{$token}/accept", $this->password())->assertCreated();

        $user = User::where('email', 'maria@empresa.com')->firstOrFail();
        $response->assertExactJson(['data' => [
            'id' => $user->id,
            'name' => 'Maria Nova',
            'email' => 'maria@empresa.com',
            'role' => 'analyst',
            'area' => ['id' => $area->id, 'name' => 'Financeiro'],
        ]]);
        $this->assertSame(Role::Analyst, $user->role);
        $this->assertSame($area->id, $user->area_id);
        $this->assertTrue(Hash::check('segredo123', $user->password));
        $this->assertNotNull($invitation->fresh()->accepted_at);

        $this->assertAuthenticatedAs($user);
        // The guard keeps the user created in this same process (flagged as just created, which would make /me answer 201).
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/me')->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_the_link_is_single_use(): void
    {
        [, $token] = Invitation::factory()->createWithToken(['email' => 'maria@empresa.com']);

        $this->postJson("/api/invitations/{$token}/accept", $this->password())->assertCreated();

        $this->getJson("/api/invitations/{$token}")->assertNotFound()->assertJsonPath('message', self::MESSAGE);
        $this->postJson("/api/invitations/{$token}/accept", $this->password('outrasenha1'))
            ->assertNotFound()
            ->assertJsonPath('message', self::MESSAGE);
        $this->assertSame(1, User::where('email', 'maria@empresa.com')->count());
    }

    public function test_expired_link_cannot_be_accepted(): void
    {
        [, $token] = Invitation::factory()->createWithToken(['expires_at' => now()->addDays(7)]);

        $this->travel(7)->days();
        $this->travel(1)->seconds();

        $this->postJson("/api/invitations/{$token}/accept", $this->password())
            ->assertNotFound()
            ->assertJsonPath('message', self::MESSAGE);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_link_within_the_seven_days_can_be_accepted(): void
    {
        [, $token] = Invitation::factory()->createWithToken(['expires_at' => now()->addDays(7)]);

        $this->travel(7)->days();
        $this->travel(-1)->seconds();

        $this->postJson("/api/invitations/{$token}/accept", $this->password())->assertCreated();
    }

    public function test_accepted_and_unknown_tokens_return_404(): void
    {
        [, $accepted] = Invitation::factory()->accepted()->createWithToken();

        $this->postJson("/api/invitations/{$accepted}/accept", $this->password())->assertNotFound();
        $this->postJson('/api/invitations/nao-existe/accept', $this->password())->assertNotFound();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_short_or_unconfirmed_password_returns_422_and_keeps_the_link_valid(): void
    {
        [, $token] = Invitation::factory()->createWithToken();

        $this->postJson("/api/invitations/{$token}/accept", $this->password('1234567'))
            ->assertUnprocessable()->assertJsonValidationErrors(['password']);
        $this->postJson("/api/invitations/{$token}/accept", ['password' => 'segredo123', 'password_confirmation' => 'diferente123'])
            ->assertUnprocessable()->assertJsonValidationErrors(['password']);
        $this->postJson("/api/invitations/{$token}/accept", ['password' => 'segredo123'])
            ->assertUnprocessable()->assertJsonValidationErrors(['password']);
        $this->postJson("/api/invitations/{$token}/accept", [])
            ->assertUnprocessable()->assertJsonValidationErrors(['password']);

        $this->assertDatabaseCount('users', 0);
        $this->assertGuest();
        $this->getJson("/api/invitations/{$token}")->assertOk();
    }

    public function test_extra_payload_fields_are_ignored(): void
    {
        $area = Area::factory()->create();
        [, $token] = Invitation::factory()->createWithToken([
            'email' => 'maria@empresa.com',
            'role' => Role::Requester,
            'area_id' => $area->id,
        ]);

        $this->postJson("/api/invitations/{$token}/accept", $this->password() + [
            'role' => 'admin',
            'email' => 'hacker@empresa.com',
            'name' => 'Outro Nome',
            'area_id' => Area::factory()->create()->id,
        ])->assertCreated()
            ->assertJsonPath('data.role', 'requester')
            ->assertJsonPath('data.email', 'maria@empresa.com');

        $user = User::where('email', 'maria@empresa.com')->firstOrFail();
        $this->assertSame(Role::Requester, $user->role);
        $this->assertSame($area->id, $user->area_id);
        $this->assertDatabaseMissing('users', ['email' => 'hacker@empresa.com']);
    }

    public function test_without_the_spa_session_returns_419_and_creates_nothing(): void
    {
        [$invitation, $token] = Invitation::factory()->createWithToken();

        $this->withoutHeader('Referer')
            ->postJson("/api/invitations/{$token}/accept", $this->password())
            ->assertStatus(419);

        $this->assertDatabaseCount('users', 0);
        $this->assertNull($invitation->fresh()->accepted_at);
        $this->assertGuest();
    }

    public function test_an_email_that_got_an_account_meanwhile_returns_404(): void
    {
        [, $token] = Invitation::factory()->createWithToken(['email' => 'maria@empresa.com']);
        User::factory()->create(['email' => 'maria@empresa.com']);

        $this->postJson("/api/invitations/{$token}/accept", $this->password())->assertNotFound();
        $this->assertSame(1, User::where('email', 'maria@empresa.com')->count());
    }
}
