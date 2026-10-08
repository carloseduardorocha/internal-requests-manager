<?php

namespace App\Actions\InternalRequests;

/**
 * Outcome of a bulk action: the processed IDs and the skipped ones with the reason.
 */
final readonly class BulkResult
{
    /**
     * @param  list<int>  $done
     * @param  list<array{id: int, reason: string, message: string}>  $skipped
     */
    public function __construct(
        public array $done,
        public array $skipped,
    ) {}

    /**
     * @return array{done: list<int>, skipped: list<array{id: int, reason: string, message: string}>}
     */
    public function toArray(): array
    {
        return ['done' => $this->done, 'skipped' => $this->skipped];
    }
}
