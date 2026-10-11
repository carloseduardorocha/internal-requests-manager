<?php

namespace Tests\Concerns;

use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\Logger;

/**
 * Routes the app logs to a Monolog TestHandler, which keeps `extra` (where the request id goes).
 */
trait CapturesLogs
{
    private TestHandler $logHandler;

    protected function captureLogs(): void
    {
        $this->logHandler = new TestHandler;
        $handler = $this->logHandler;

        Log::extend('capture', fn () => new Logger('capture', [$handler]));
        config(['logging.channels.capture' => ['driver' => 'capture'], 'logging.default' => 'capture']);
        Log::forgetChannel('capture');
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function logRecords(?string $message = null): array
    {
        $records = array_map(fn ($record) => $record->toArray(), $this->logHandler->getRecords());

        return array_values(array_filter($records, fn ($r) => $message === null || $r['message'] === $message));
    }

    /**
     * @return array<string, mixed>
     */
    protected function singleLog(string $message): array
    {
        $records = $this->logRecords($message);
        $this->assertCount(1, $records, "Expected exactly one '{$message}' log record.");

        return $records[0];
    }

    protected function allLogsAsString(): string
    {
        return json_encode($this->logRecords(), JSON_THROW_ON_ERROR);
    }
}
