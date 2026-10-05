<?php

namespace Tests\Unit\Enums;

use App\Enums\InternalRequestStatus;
use PHPUnit\Framework\TestCase;

class InternalRequestStatusTest extends TestCase
{
    public function test_only_the_three_flow_transitions_are_allowed(): void
    {
        $allowed = [
            'open' => ['in_review'],
            'in_review' => ['approved', 'rejected'],
            'approved' => [],
            'rejected' => [],
        ];

        $checked = 0;

        foreach (InternalRequestStatus::cases() as $from) {
            foreach (InternalRequestStatus::cases() as $to) {
                $this->assertSame(
                    in_array($to->value, $allowed[$from->value], true),
                    $from->canTransitionTo($to),
                    "{$from->value} -> {$to->value}",
                );
                $checked++;
            }
        }

        $this->assertSame(16, $checked);
    }
}
