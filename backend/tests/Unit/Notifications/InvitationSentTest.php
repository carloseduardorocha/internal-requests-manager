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

    private function invitation(string $name = 'Maria Nova'): Invitation
    {
        return Invitation::factory()
            ->for(Area::factory()->state(['name' => 'Financeiro']))
            ->create(['name' => $name, 'email' => 'maria@empresa.com']);
    }

    public function test_it_is_queued_encrypted_and_goes_by_mail(): void
    {
        $notification = new InvitationSent($this->invitation(), 'tok');

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertInstanceOf(ShouldBeEncrypted::class, $notification);
        $this->assertSame(['mail'], $notification->via(new AnonymousNotifiable));
    }

    public function test_mail_has_the_create_account_button_pointing_to_the_frontend(): void
    {
        config(['app.frontend_url' => 'https://app.example.com/']);

        $mail = (new InvitationSent($this->invitation(), 'abc123'))->toMail(new AnonymousNotifiable);

        $this->assertSame('Criar conta', $mail->actionText);
        $this->assertSame('https://app.example.com/accept-invitation?token=abc123', $mail->actionUrl);
    }

    public function test_mail_shows_the_typed_name_literally(): void
    {
        $html = (string) (new InvitationSent($this->invitation('# [x](https://evil.test) <b>Maria</b>'), 'tok'))
            ->toMail(new AnonymousNotifiable)->render();

        $this->assertStringContainsString('# [x](https://evil.test)', html_entity_decode($html));
        $this->assertStringNotContainsString('href="https://evil.test"', $html);
        $this->assertStringNotContainsString('<b>', $html);
    }

    public function test_mail_shows_the_name_and_area(): void
    {
        $html = (string) (new InvitationSent($this->invitation(), 'tok'))->toMail(new AnonymousNotifiable)->render();

        $this->assertStringContainsString('Maria Nova', $html);
        $this->assertStringContainsString('Financeiro', $html);
    }
}
