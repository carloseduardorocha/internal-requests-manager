<?php

namespace Tests\Unit\Logging;

use App\Models\InternalRequest;
use App\Notifications\InternalRequestCreated;
use App\Notifications\InvitationSent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\CapturesLogs;
use Tests\TestCase;

class LogNotificationFailureTest extends TestCase
{
    use CapturesLogs, RefreshDatabase;

    public function test_a_failed_invitation_logs_without_a_request_id_and_with_the_exception_class_only(): void
    {
        $this->captureLogs();
        $notification = new InvitationSent('Maria Nova', 'analyst', 'Financeiro', now()->addDays(7), 'tok-secret');

        Event::dispatch(new NotificationFailed(
            new AnonymousNotifiable,
            $notification,
            'mail',
            ['exception' => new \RuntimeException('smtp said maria@empresa.com is invalid')],
        ));

        $log = $this->singleLog('notification.failed');
        $this->assertSame('WARNING', $log['level_name']);
        $this->assertSame(
            ['notification' => 'InvitationSent', 'channel' => 'mail', 'exception' => \RuntimeException::class],
            $log['context'],
        );
        $this->assertStringNotContainsString('maria@empresa.com', $this->allLogsAsString());
        $this->assertStringNotContainsString('tok-secret', $this->allLogsAsString());
    }

    public function test_a_failed_request_notification_logs_the_request_id(): void
    {
        $this->captureLogs();
        $request = InternalRequest::factory()->create();

        Event::dispatch(new NotificationFailed(
            new AnonymousNotifiable,
            new InternalRequestCreated($request),
            'discord',
            ['exception' => new \RuntimeException('Discord webhook responded with status 500')],
        ));

        $this->assertSame(
            [
                'notification' => 'InternalRequestCreated',
                'channel' => 'discord',
                'internal_request_id' => $request->id,
                'exception' => \RuntimeException::class,
            ],
            $this->singleLog('notification.failed')['context'],
        );
    }
}
