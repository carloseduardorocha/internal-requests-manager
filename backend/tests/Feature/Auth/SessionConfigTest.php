<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;

class SessionConfigTest extends TestCase
{
    public function test_adr_0004_session_values_are_wired(): void
    {
        $this->assertTrue(config('session.expire_on_close'));
        $this->assertSame(120, (int) config('session.lifetime'));
        $this->assertSame(43200, (int) config('auth.guards.web.remember'));
    }

    public function test_login_throttle_values_follow_the_adr(): void
    {
        $this->assertSame(5, config('auth.login_throttle.max_attempts'));
        $this->assertSame(15, config('auth.login_throttle.decay_minutes'));
    }
}
