<?php

namespace Tests\Feature\Users;

use App\Models\Area;
use App\Models\InternalRequest;
use App\Models\InternalRequestStatusChange;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationSent;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class DeactivatedAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_of_a_deactivated_account_fails_like_a_wrong_password(): void
    {
        User::factory()->deactivated()->create(['email' => 'ana@empresa.com']);
        User::factory()->create(['email' => 'bia@empresa.com']);

        $off = $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
        $wrong = $this->postJson('/api/login', ['email' => 'bia@empresa.com', 'password' => 'wrong'])
            ->assertUnprocessable();

        $this->assertSame(__('auth.failed'), $off->json('errors.email.0'));
        $this->assertSame($wrong->json('errors.email.0'), $off->json('errors.email.0'));
        $this->assertGuest('web');
    }

    public function test_login_attempts_of_a_deactivated_account_count_for_the_block(): void
    {
        User::factory()->deactivated()->create(['email' => 'ana@empresa.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])->assertUnprocessable();
        }

        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])->assertStatus(429);
    }

    public function test_reactivating_gives_the_access_back_with_the_same_password(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create(['email' => 'ana@empresa.com']);

        $this->actingAs($admin)->postJson("/api/users/{$target->id}/deactivate")->assertOk();
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])->assertUnprocessable();

        $this->actingAs($admin)->postJson("/api/users/{$target->id}/reactivate")->assertOk();
        $this->app['auth']->forgetGuards();
        $this->flushSession();

        $this->postJson('/api/login', ['email' => 'ana@empresa.com', 'password' => 'password'])->assertOk();
    }

    public function test_requests_and_history_stay_as_they_were_after_the_deactivation(): void
    {
        $admin = User::factory()->admin()->create();
        $person = User::factory()->analyst()->create(['name' => 'Bruno Lima']);
        $requester = User::factory()->create();

        $decided = InternalRequest::factory()->approved($person)->create(['requester_id' => $requester->id]);
        InternalRequestStatusChange::factory()->create([
            'internal_request_id' => $decided->id,
            'from_status' => 'in_review',
            'to_status' => 'approved',
            'changed_by' => $person->id,
        ]);
        $own = InternalRequest::factory()->create(['requester_id' => $person->id]);

        $this->actingAs($admin)->postJson("/api/users/{$person->id}/deactivate")->assertOk();

        $this->actingAs($admin)->getJson("/api/internal-requests/{$decided->id}")
            ->assertOk()
            ->assertJsonPath('data.assigned_to.id', $person->id)
            ->assertJsonPath('data.assigned_to.name', 'Bruno Lima')
            ->assertJsonPath('data.decision.decided_by.name', 'Bruno Lima')
            ->assertJsonPath('data.history.0.changed_by.name', 'Bruno Lima');

        $this->actingAs($admin)->getJson("/api/internal-requests/{$own->id}")
            ->assertOk()
            ->assertJsonPath('data.requester.name', 'Bruno Lima');

        $this->assertDatabaseHas('users', ['id' => $person->id]);
    }

    public function test_the_admin_can_decide_a_request_in_review_with_a_deactivated_analyst(): void
    {
        $admin = User::factory()->admin()->create();
        $analyst = User::factory()->analyst()->create(['name' => 'Bruno Lima']);
        $request = InternalRequest::factory()->inReview($analyst)->create();

        $this->actingAs($admin)->postJson("/api/users/{$analyst->id}/deactivate")->assertOk();

        $this->actingAs($admin)
            ->postJson("/api/internal-requests/{$request->id}/approve", ['justification' => 'Aprovado pelo admin'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.assigned_to.name', 'Bruno Lima')
            ->assertJsonPath('data.decision.decided_by.id', $admin->id);
    }

    public function test_inviting_the_email_of_a_deactivated_account_is_refused(): void
    {
        Notification::fake();
        User::factory()->deactivated()->create(['email' => 'ana@empresa.com']);
        $area = Area::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/invitations', [
                'name' => 'Ana', 'email' => 'ana@empresa.com', 'role' => 'analyst', 'area_id' => $area->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'Este e-mail pertence a uma conta desativada. Reative a conta em Usuários.');

        $this->assertSame(0, Invitation::count());
        Notification::assertNothingSentTo(new AnonymousNotifiable);
        Notification::assertSentOnDemandTimes(InvitationSent::class, 0);
    }

    public function test_inviting_the_email_of_an_active_account_keeps_the_usual_message(): void
    {
        User::factory()->create(['email' => 'ana@empresa.com']);
        $area = Area::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/invitations', [
                'name' => 'Ana', 'email' => 'ana@empresa.com', 'role' => 'analyst', 'area_id' => $area->id,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Este e-mail já possui uma conta.');
    }

    public function test_forgot_password_of_a_deactivated_account_answers_204_without_sending_the_mail(): void
    {
        Notification::fake();
        $off = User::factory()->deactivated()->create(['email' => 'ana@empresa.com']);

        $this->postJson('/api/forgot-password', ['email' => 'ana@empresa.com'])->assertNoContent();

        Notification::assertNotSentTo($off, ResetPasswordNotification::class);
        Notification::assertSentTimes(ResetPasswordNotification::class, 0);
    }

    public function test_a_reset_link_issued_before_the_deactivation_is_refused(): void
    {
        $user = User::factory()->create(['email' => 'ana@empresa.com']);
        $token = Password::broker()->createToken($user);
        $oldHash = $user->password;
        $user->forceFill(['deactivated_at' => now()])->save();

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'ana@empresa.com',
            'password' => 'nova-senha-123',
            'password_confirmation' => 'nova-senha-123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['token'])
            ->assertJsonPath('errors.token.0', 'Este link de recuperação é inválido ou expirou. Peça um novo.');

        $this->assertSame($oldHash, $user->fresh()->password);
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }
}
