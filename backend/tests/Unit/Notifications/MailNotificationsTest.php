<?php

namespace Tests\Unit\Notifications;

use App\Models\InternalRequest;
use App\Models\User;
use App\Notifications\InternalRequestAssumed;
use App\Notifications\InternalRequestDecided;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Messages\MailMessage;
use Tests\TestCase;

class MailNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_assumed_goes_by_mail(): void
    {
        $notification = new InternalRequestAssumed(InternalRequest::factory()->inReview()->create());

        $this->assertSame(['mail'], $notification->via(User::factory()->make()));
    }

    public function test_decided_goes_by_mail_to_a_user_and_by_discord_to_the_team(): void
    {
        $notification = new InternalRequestDecided(InternalRequest::factory()->approved()->create());

        $this->assertSame(['mail'], $notification->via(User::factory()->make()));
        $this->assertSame(['discord'], $notification->via(new AnonymousNotifiable));
    }

    public function test_assumed_is_queued_after_commit_with_four_tries_and_backoff(): void
    {
        $notification = new InternalRequestAssumed(InternalRequest::factory()->inReview()->create());

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertTrue($notification->afterCommit);
        $this->assertSame(4, $notification->tries);
        $this->assertSame([60, 300, 900], $notification->backoff());
    }

    public function test_assumed_mail_content(): void
    {
        $analyst = User::factory()->analyst()->create(['name' => 'Ana Analista']);
        $request = InternalRequest::factory()->inReview($analyst)->create(['title' => 'Troca de monitor']);

        $mail = (new InternalRequestAssumed($request))->toMail($request->requester);

        $this->assertInstanceOf(MailMessage::class, $mail);
        $this->assertSame("Seu pedido #{$request->id} está em análise", $mail->subject);
        $this->assertSame('Ver pedido', $mail->actionText);
        $this->assertSame("http://localhost:3000/requests/{$request->id}", $mail->actionUrl);
        $text = $this->text($mail);
        $this->assertStringContainsString('Troca de monitor', $text);
        $this->assertStringContainsString('Ana Analista', $text);
    }

    public function test_decided_mail_content_when_approved(): void
    {
        $analyst = User::factory()->analyst()->create(['name' => 'Ana Analista']);
        $request = InternalRequest::factory()->approved($analyst)->create(['title' => 'Troca de monitor']);

        $mail = (new InternalRequestDecided($request))->toMail($request->requester);

        $this->assertSame("Seu pedido #{$request->id} foi aprovado", $mail->subject);
        $this->assertSame('Ver pedido', $mail->actionText);
        $this->assertSame("http://localhost:3000/requests/{$request->id}", $mail->actionUrl);
        $text = $this->text($mail);
        $this->assertStringContainsString('Troca de monitor', $text);
        $this->assertStringContainsString('Ana Analista', $text);
        $this->assertStringContainsString($request->decision_justification, $text);
    }

    public function test_decided_mail_content_when_rejected(): void
    {
        $request = InternalRequest::factory()->rejected()->create();

        $mail = (new InternalRequestDecided($request))->toMail($request->requester);

        $this->assertSame("Seu pedido #{$request->id} foi rejeitado", $mail->subject);
        $this->assertStringContainsString($request->decision_justification, $this->text($mail));
    }

    public function test_action_url_follows_the_configured_frontend_url(): void
    {
        config(['app.frontend_url' => 'https://app.example.com/']);
        $request = InternalRequest::factory()->inReview()->create();

        $mail = (new InternalRequestAssumed($request))->toMail($request->requester);

        $this->assertSame("https://app.example.com/requests/{$request->id}", $mail->actionUrl);
    }

    private function text(MailMessage $mail): string
    {
        return implode("\n", array_merge([$mail->greeting], $mail->introLines, $mail->outroLines));
    }
}
