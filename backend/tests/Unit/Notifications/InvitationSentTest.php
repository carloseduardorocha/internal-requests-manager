<?php

namespace Tests\Unit\Notifications;

use App\Models\Area;
use App\Models\Invitation;
use App\Notifications\InvitationSent;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Tests\TestCase;

class InvitationSentTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_is_queued_encrypted_and_goes_by_mail(): void
    {
        $notification = new InvitationSent('Maria Nova', 'analyst', 'Financeiro', now()->addDays(7), 'tok');

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertInstanceOf(ShouldBeEncrypted::class, $notification);
        $this->assertSame(['mail'], $notification->via(new AnonymousNotifiable));
    }

    public function test_mail_has_the_create_account_button_pointing_to_the_frontend(): void
    {
        config(['app.frontend_url' => 'https://app.example.com/']);

        $mail = (new InvitationSent('Maria Nova', 'analyst', 'Financeiro', now()->addDays(7), 'abc123'))->toMail(new AnonymousNotifiable);

        $this->assertSame('Criar conta', $mail->actionText);
        $this->assertSame('https://app.example.com/accept-invitation?token=abc123', $mail->actionUrl);
    }

    public function test_mail_shows_the_typed_name_literally(): void
    {
        $html = (string) (new InvitationSent('# [x](https://evil.test) <b>Maria</b>', 'analyst', 'Financeiro', now()->addDays(7), 'tok'))
            ->toMail(new AnonymousNotifiable)->render();

        $this->assertStringContainsString('# [x](https://evil.test)', html_entity_decode($html));
        $this->assertStringNotContainsString('href="https://evil.test"', $html);
        $this->assertStringNotContainsString('<b>', $html);
    }

    public function test_mail_shows_the_name_and_area(): void
    {
        $html = (string) (new InvitationSent('Maria Nova', 'analyst', 'Financeiro', now()->addDays(7), 'tok'))->toMail(new AnonymousNotifiable)->render();

        $this->assertStringContainsString('Maria Nova', $html);
        $this->assertStringContainsString('Financeiro', $html);
    }

    public function test_mail_keeps_the_original_data_when_the_invitation_changes_later(): void
    {
        $invitation = Invitation::factory()
            ->for(Area::factory()->state(['name' => 'Financeiro']))
            ->create(['name' => 'Maria Nova']);
        $notification = new InvitationSent($invitation->name, $invitation->role->value, 'Financeiro', $invitation->expires_at, 'tok');

        $invitation->update(['name' => 'Outra Pessoa', 'area_id' => Area::factory()->create(['name' => 'Jurídico'])->id]);

        $html = (string) $notification->toMail(new AnonymousNotifiable)->render();
        $this->assertStringContainsString('Maria Nova', $html);
        $this->assertStringContainsString('Financeiro', $html);
        $this->assertStringNotContainsString('Outra Pessoa', $html);
        $this->assertStringNotContainsString('Jurídico', $html);
    }

    public function test_the_subject_names_the_product_in_portuguese(): void
    {
        $mail = (new InvitationSent('Maria', 'analyst', 'Financeiro', now()->addDays(7), 'tok'))->toMail(new AnonymousNotifiable);

        $this->assertSame('Convite para a Gestão de Solicitações Internas', $mail->subject);
    }
}
