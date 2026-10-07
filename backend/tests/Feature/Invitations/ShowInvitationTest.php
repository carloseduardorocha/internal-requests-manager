<?php

namespace Tests\Feature\Invitations;

use App\Models\Area;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShowInvitationTest extends TestCase
{
    use RefreshDatabase;

    private const MESSAGE = 'Este convite expirou ou já foi usado. Peça um novo convite ao administrador.';

    public function test_guest_sees_the_invitation_data_without_id_or_token(): void
    {
        $area = Area::factory()->create(['name' => 'Financeiro']);
        [$invitation, $token] = Invitation::factory()->createWithToken([
            'name' => 'Maria Nova',
            'email' => 'maria@empresa.com',
            'area_id' => $area->id,
        ]);

        $this->getJson("/api/invitations/{$token}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Maria Nova')
            ->assertJsonPath('data.email', 'maria@empresa.com')
            ->assertJsonPath('data.role', 'requester')
            ->assertJsonPath('data.area', ['id' => $area->id, 'name' => 'Financeiro'])
            ->assertJsonPath('data.expires_at', $invitation->expires_at->toJSON())
            ->assertJsonMissingPath('data.id')
            ->assertJsonMissingPath('data.token');
    }

    public function test_unknown_token_returns_404_with_the_message(): void
    {
        $this->getJson('/api/invitations/nao-existe')
            ->assertNotFound()
            ->assertJsonPath('message', self::MESSAGE)
            ->assertJsonMissingPath('data');
    }

    public function test_the_hash_stored_in_the_database_is_not_a_valid_token(): void
    {
        [$invitation] = Invitation::factory()->createWithToken();

        $this->getJson("/api/invitations/{$invitation->token}")->assertNotFound();
    }

    public function test_link_is_valid_for_seven_days(): void
    {
        $this->freezeSecond();
        [, $token] = Invitation::factory()->createWithToken(['expires_at' => now()->addDays(7)]);

        $this->travel(7)->days();
        $this->travel(-1)->seconds();
        $this->getJson("/api/invitations/{$token}")->assertOk();

        $this->travel(2)->seconds();
        $this->getJson("/api/invitations/{$token}")
            ->assertNotFound()
            ->assertJsonPath('message', self::MESSAGE);
    }

    public function test_an_email_that_got_an_account_meanwhile_returns_404(): void
    {
        [, $token] = Invitation::factory()->createWithToken(['email' => 'maria@empresa.com']);
        User::factory()->create(['email' => 'maria@empresa.com']);

        $this->getJson("/api/invitations/{$token}")->assertNotFound()->assertJsonPath('message', self::MESSAGE);
    }

    public function test_expired_and_accepted_invitations_return_404(): void
    {
        [, $expired] = Invitation::factory()->expired()->createWithToken();
        [, $accepted] = Invitation::factory()->accepted()->createWithToken();

        $this->getJson("/api/invitations/{$expired}")->assertNotFound()->assertJsonPath('message', self::MESSAGE);
        $this->getJson("/api/invitations/{$accepted}")->assertNotFound()->assertJsonPath('message', self::MESSAGE);
    }
}
