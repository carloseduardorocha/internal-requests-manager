<?php

namespace App\Notifications\Concerns;

use Illuminate\Support\HtmlString;

trait EscapesUserText
{
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
