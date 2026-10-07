<?php

namespace Tests\Unit\Invitations;

use App\Actions\Invitations\SendInvitation;
use App\Enums\Role;
use App\Models\Area;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationSent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SendInvitationActionTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_invitation_accepted_meanwhile_is_not_reopened(): void
    {
        Notification::fake();
        [$invitation] = Invitation::factory()->accepted()->createWithToken(['email' => 'maria@empresa.com']);
        User::factory()->create(['email' => 'maria@empresa.com']);
        $before = $invitation->fresh()->getAttributes();

        try {
            app(SendInvitation::class)->handle('Outra', 'maria@empresa.com', Role::Admin, Area::factory()->create()->id);
            $this->fail('Expected ValidationException.');
        } catch (ValidationException $e) {
            $this->assertSame(['Este e-mail já possui uma conta.'], $e->errors()['email']);
        }

        $this->assertSame($before, $invitation->fresh()->getAttributes());
        Notification::assertSentOnDemandTimes(InvitationSent::class, 0);
    }
}
