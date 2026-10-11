<?php

namespace Tests\Unit\Logging;

use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\Log;
use Monolog\Formatter\JsonFormatter;
use Tests\TestCase;

class StderrJsonLogTest extends TestCase
{
    public function test_each_stderr_line_is_valid_json_with_level_message_date_context_and_request_id(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'log');

        try {
            config([
                'logging.channels.stderr.formatter' => JsonFormatter::class,
                'logging.channels.stderr.handler_with.stream' => $file,
            ]);
            Log::forgetChannel('stderr');
            Context::add('request_id', 'req-123');

            Log::channel('stderr')->info('internal_request.created', ['internal_request_id' => 7]);
            Log::channel('stderr')->warning('second line');

            $lines = array_values(array_filter(explode("\n", (string) file_get_contents($file))));
            $this->assertCount(2, $lines);

            $first = json_decode($lines[0], true, flags: JSON_THROW_ON_ERROR);
            $this->assertSame('internal_request.created', $first['message']);
            $this->assertSame('INFO', $first['level_name']);
            $this->assertArrayHasKey('datetime', $first);
            $this->assertSame(['internal_request_id' => 7], $first['context']);
            $this->assertSame('req-123', $first['extra']['request_id']);

            $second = json_decode($lines[1], true, flags: JSON_THROW_ON_ERROR);
            $this->assertSame('WARNING', $second['level_name']);
        } finally {
            unlink($file);
        }
    }

    public function test_an_exception_brings_its_stack_trace_in_the_same_json_line(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'log');

        try {
            config([
                'logging.channels.stderr.formatter' => JsonFormatter::class,
                'logging.channels.stderr.handler_with.stream' => $file,
            ]);
            Log::forgetChannel('stderr');

            Log::channel('stderr')->error('boom', ['exception' => new \RuntimeException('failed')]);

            $lines = array_values(array_filter(explode("\n", (string) file_get_contents($file))));
            $this->assertCount(1, $lines);

            $record = json_decode($lines[0], true, flags: JSON_THROW_ON_ERROR);
            $this->assertSame('failed', $record['context']['exception']['message']);
            $this->assertArrayHasKey('trace', $record['context']['exception']);
        } finally {
            unlink($file);
        }
    }
}
