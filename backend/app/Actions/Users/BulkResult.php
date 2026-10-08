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

    /**
     * @return array{done: list<int>, skipped: list<array{id: int, reason: string, message: string}>}
     */
    public function toArray(): array
    {
        return ['done' => $this->done, 'skipped' => $this->skipped];
    }
}
