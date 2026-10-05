<?php

namespace Tests\Unit\Notifications;

use App\Models\InternalRequest;
use App\Notifications\InternalRequestCreated;
use App\Notifications\InternalRequestDecided;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\AnonymousNotifiable;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class InternalRequestNotificationTest extends TestCase
{
    /**
     * @return array<string, array{class-string}>
     */
    public static function notifications(): array
    {
        return [
            'created' => [InternalRequestCreated::class],
            'decided' => [InternalRequestDecided::class],
        ];
    }

    #[DataProvider('notifications')]
    public function test_it_is_queued_after_commit_with_four_tries_and_backoff(string $class): void
    {
        $notification = new $class(new InternalRequest);

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertTrue($notification->afterCommit);
        $this->assertSame(4, $notification->tries);
        $this->assertSame([60, 300, 900], $notification->backoff());
        $this->assertSame(['discord'], $notification->via(new AnonymousNotifiable));
    }
}
