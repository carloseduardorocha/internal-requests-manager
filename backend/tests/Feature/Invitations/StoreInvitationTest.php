<?php

namespace Tests\Feature\Invitations;

use App\Models\Area;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationSent;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use ReflectionProperty;
use Tests\TestCase;

class StoreInvitationTest extends TestCase
{
    use RefreshDatabase;

    private const MESSAGE = 'Este convite expirou ou já foi usado. Peça um novo convite ao administrador.';

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Maria Nova',
            'email' => 'maria@empresa.com',
            'role' => 'analyst',
            'area_id' => Area::firstOrCreate(['name' => 'Financeiro'])->id,
        ], $overrides);
    }

    /**
     * Plain link tokens of the invitations sent so far, in order.
     *
     * @return list<string>
     */
    private function sentTokens(): array
    {
        $tokens = [];
        Notification::assertSentOnDemand(InvitationSent::class, function (InvitationSent $notification) use (&$tokens) {
            $tokens[] = (new ReflectionProperty($notification, 'token'))->getValue($notification);

            return true;
        });

        return $tokens;
    }

    public function test_admin_creates_an_invitation_and_the_mail_is_sent(): void
    {
        Notification::fake();
        $payload = $this->payload();

        $response = $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/invitations', $payload)
            ->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'name', 'email', 'role', 'area' => ['id', 'name'], 'expires_at']])
            ->assertJsonPath('data.name', 'Maria Nova')
            ->assertJsonPath('data.email', 'maria@empresa.com')
            ->assertJsonPath('data.role', 'analyst')
            ->assertJsonPath('data.area.id', $payload['area_id'])
            ->assertJsonPath('data.area.name', 'Financeiro')
            ->assertJsonMissingPath('data.token');

        $this->assertDatabaseHas('invitations', [
            'id' => $response->json('data.id'),
            'email' => 'maria@empresa.com',
            'role' => 'analyst',
            'area_id' => $payload['area_id'],
            'accepted_at' => null,
        ]);
        Notification::assertSentOnDemand(
            InvitationSent::class,
            fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === 'maria@empresa.com',
        );
        Notification::assertSentOnDemandTimes(InvitationSent::class, 1);
    }

    public function test_expiry_follows_the_configured_days(): void
    {
        Notification::fake();
        $this->assertSame(7, config('auth.invitations.expire_days'));

        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/invitations', $this->payload())
            ->assertCreated();

        $expiresAt = Invitation::firstOrFail()->expires_at;
        $this->assertTrue($expiresAt->between(now()->addDays(7)->subMinute(), now()->addDays(7)->addMinute()));
    }

    public function test_expiry_uses_the_configured_days_value(): void
    {
        Notification::fake();
        $this->freezeSecond();
        config(['auth.invitations.expire_days' => 3]);

        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/invitations', $this->payload())
            ->assertCreated();

        $this->assertTrue(Invitation::firstOrFail()->expires_at->equalTo(now()->addDays(3)));
    }

    public function test_notification_is_queued_and_encrypted(): void
    {
        $this->assertTrue(is_subclass_of(InvitationSent::class, ShouldQueue::class));
        $this->assertTrue(is_subclass_of(InvitationSent::class, ShouldBeEncrypted::class));
    }

    public function test_stored_token_is_the_sha256_of_the_link_token_and_not_the_plain_one(): void
    {
        Notification::fake();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/invitations', $this->payload())
            ->assertCreated();

        [$plain] = $this->sentTokens();
        $stored = Invitation::firstOrFail()->token;

        $this->assertNotSame($plain, $stored);
        $this->assertSame(hash('sha256', $plain), $stored);
        $this->getJson("/api/invitations/{$plain}")->assertOk();
    }

    public function test_requester_and_analyst_get_403_and_nothing_is_created(): void
    {
        Notification::fake();

        $this->actingAs(User::factory()->create())->postJson('/api/invitations', $this->payload())->assertForbidden();
        $this->actingAs(User::factory()->analyst()->create())->postJson('/api/invitations', $this->payload())->assertForbidden();

        $this->assertDatabaseCount('invitations', 0);
        Notification::assertSentOnDemandTimes(InvitationSent::class, 0);
    }

    public function test_non_admin_gets_403_before_validation_and_cannot_probe_accounts(): void
    {
        User::factory()->create(['email' => 'maria@empresa.com']);

        foreach ([User::factory()->create(), User::factory()->analyst()->create()] as $user) {
            $this->actingAs($user)->postJson('/api/invitations', ['email' => 'maria@empresa.com'])->assertForbidden();
            $this->actingAs($user)->postJson('/api/invitations', [])->assertForbidden();
        }
    }

    public function test_validation_messages_use_the_field_labels(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/invitations', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.role.0', 'É obrigatória a indicação de um valor para o campo perfil.')
            ->assertJsonPath('errors.area_id.0', 'É obrigatória a indicação de um valor para o campo área.')
            ->assertJsonPath('errors.name.0', 'É obrigatória a indicação de um valor para o campo nome.');
    }

    public function test_guest_gets_401(): void
    {
        $this->postJson('/api/invitations', $this->payload())->assertUnauthorized();

        $this->assertDatabaseCount('invitations', 0);
    }

    public function test_email_that_already_has_an_account_is_refused(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'maria@empresa.com']);

        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/invitations', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'Este e-mail já possui uma conta.');

        $this->assertDatabaseCount('invitations', 0);
        Notification::assertSentOnDemandTimes(InvitationSent::class, 0);
    }

    public function test_invalid_fields_fail_validation(): void
    {
        Notification::fake();
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/invitations', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'role', 'area_id']);

        $this->actingAs($admin)->postJson('/api/invitations', $this->payload(['role' => 'boss']))
            ->assertUnprocessable()->assertJsonValidationErrors(['role']);

        $this->actingAs($admin)->postJson('/api/invitations', $this->payload(['area_id' => 999999]))
            ->assertUnprocessable()->assertJsonValidationErrors(['area_id']);

        $this->actingAs($admin)->postJson('/api/invitations', $this->payload(['email' => 'not-an-email']))
            ->assertUnprocessable()->assertJsonValidationErrors(['email']);

        $this->assertDatabaseCount('invitations', 0);
        Notification::assertSentOnDemandTimes(InvitationSent::class, 0);
    }

    public function test_inviting_again_keeps_one_row_and_invalidates_the_old_link(): void
    {
        Notification::fake();
        $admin = User::factory()->admin()->create();
        $password = ['password' => 'segredo123', 'password_confirmation' => 'segredo123'];

        $this->actingAs($admin)->postJson('/api/invitations', $this->payload())->assertCreated();
        $this->actingAs($admin)->postJson('/api/invitations', $this->payload(['name' => 'Maria Atualizada']))
            ->assertCreated()
            ->assertJsonPath('data.name', 'Maria Atualizada');

        $this->assertDatabaseCount('invitations', 1);

        $tokens = $this->sentTokens();
        $this->assertCount(2, $tokens);
        [$old, $new] = $tokens;

        $this->getJson("/api/invitations/{$old}")->assertNotFound()->assertJsonPath('message', self::MESSAGE);
        $this->postJson("/api/invitations/{$old}/accept", $password)->assertNotFound();
        $this->assertDatabaseMissing('users', ['email' => 'maria@empresa.com']);

        $this->getJson("/api/invitations/{$new}")->assertOk()->assertJsonPath('data.name', 'Maria Atualizada');
        $this->postJson("/api/invitations/{$new}/accept", $password)->assertCreated();
    }

    public function test_reinviting_resets_an_expired_invitation(): void
    {
        Notification::fake();
        Invitation::factory()->expired()->create(['email' => 'maria@empresa.com']);

        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/invitations', $this->payload())
            ->assertCreated();

        $this->assertDatabaseCount('invitations', 1);
        $this->assertTrue(Invitation::firstOrFail()->expires_at->isFuture());
    }
}
