<?php

namespace App\Notifications;

use App\Enums\NotificationEvent;
use App\Models\InternalRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

abstract class InternalRequestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 4;

    public function __construct(public InternalRequest $internalRequest)
    {
        $this->afterCommit();
    }

    /**
     * Seconds to wait before each retry (ADR 0005).
     *
     * @return list<int>
     */
    public function backoff(): array
    {
        return [60, 300, 900];
    }

    abstract public function event(): NotificationEvent;

    /**
     * Link to the request detail in the front-end.
     */
    protected function requestUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/requests/'.$this->internalRequest->id;
    }

    /**
     * Make user-provided text show up literally in a markdown mail line.
     *
     * Every punctuation character becomes a numeric entity, which the markdown parser
     * treats as plain text (no links, headings or code). Surrounding whitespace is
     * trimmed, since HtmlString lines skip the trim and indentation would open a code block.
     */
    protected function literal(?string $text): string
    {
        return (string) preg_replace_callback(
            '/[^\p{L}\p{N}\s]/u',
            fn (array $match): string => '&#'.mb_ord($match[0]).';',
            trim((string) $text),
        );
    }

    /**
     * Show one line of user-provided text literally, as a whole mail line.
     */
    protected function text(string $text): HtmlString
    {
        return new HtmlString($this->literal($text));
    }

    /**
     * Translate a mail line, inserting the given user-provided values literally.
     *
     * Whitespace inside the values is collapsed, so a value can never break the paragraph.
     *
     * @param  array<string, string|null>  $literals
     */
    protected function line(string $key, array $literals): HtmlString
    {
        return new HtmlString(__($key, array_map(
            fn (?string $value): string => $this->literal(preg_replace('/\s+/u', ' ', (string) $value)),
            $literals,
        )));
    }
}
