<?php

namespace Tests\Unit\Notifications;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Messages\MailMessage;
use Tests\TestCase;

class ResetPasswordNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_goes_by_mail_only(): void
    {
        $this->assertSame(['mail'], (new ResetPasswordNotification('abc'))->via(User::factory()->make()));
    }

    public function test_it_is_queued_encrypted_after_commit_with_four_tries_and_backoff(): void
    {
        $notification = new ResetPasswordNotification('abc');

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertInstanceOf(ShouldBeEncrypted::class, $notification);
        $this->assertTrue($notification->afterCommit);
        $this->assertSame(4, $notification->tries);
        $this->assertSame([60, 300, 900], $notification->backoff());
    }

    public function test_the_mail_links_to_the_front_end_with_the_token_and_the_email(): void
    {
        config(['app.frontend_url' => 'https://app.empresa.com/']);
        $user = User::factory()->make(['name' => 'Ana Analista', 'email' => 'ana+teste@empresa.com']);

        $mail = (new ResetPasswordNotification('tok123'))->toMail($user);

        $this->assertInstanceOf(MailMessage::class, $mail);
        $this->assertSame('Redefinição de senha', $mail->subject);
        $this->assertSame('Criar nova senha', $mail->actionText);
        $this->assertSame(
            'https://app.empresa.com/reset-password?token=tok123&email=ana%2Bteste%40empresa.com',
            $mail->actionUrl,
        );
    }

    public function test_the_mail_states_the_validity_and_the_ignore_notice_and_greets_by_name(): void
    {
        $user = User::factory()->make(['name' => 'Ana Analista']);

        $mail = (new ResetPasswordNotification('tok123'))->toMail($user);

        $text = implode("\n", array_merge([$mail->greeting], $mail->introLines, $mail->outroLines));
        $this->assertStringContainsString('Ana Analista', $mail->greeting);
        $this->assertStringContainsString('60 minutos', $text);
        $this->assertStringContainsString('só pode ser usado uma vez', $text);
        $this->assertStringContainsString('ignore este e-mail', $text);
        $this->assertStringNotContainsString('tok123', $text);
    }
}
