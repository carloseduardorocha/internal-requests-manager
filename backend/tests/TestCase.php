<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Makes requests stateful in Sanctum, as the browser does.
        $this->withHeader('Referer', 'http://localhost:3000');
    }
}
