<?php

namespace App\Actions\Users;

final class BulkResult
{
    /**
     * @param  list<int>  $done
     * @param  list<array{id: int, reason: string, message: string}>  $skipped
     */
    public function __construct(
        public readonly array $done,
        public readonly array $skipped,
    ) {}
}
