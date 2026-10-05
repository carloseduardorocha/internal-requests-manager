<?php

namespace App\Support;

use Illuminate\Support\HtmlString;

class MailText
{
    /**
     * Make user-provided text show up literally in a markdown mail line.
     *
     * Every punctuation character becomes a numeric entity, which the markdown parser
     * treats as plain text (no links, headings or code).
     */
    public static function literal(?string $text): string
    {
        return (string) preg_replace_callback(
            '/[^\p{L}\p{N}\s]/u',
            fn (array $match): string => '&#'.mb_ord($match[0]).';',
            (string) $text,
        );
    }

    /**
     * Show a user-provided line literally, as a whole mail line.
     */
    public static function text(string $text): HtmlString
    {
        return new HtmlString(self::literal($text));
    }

    /**
     * Translate a mail line, inserting the given user-provided values literally.
     *
     * @param  array<string, string|null>  $literals
     */
    public static function line(string $key, array $literals): HtmlString
    {
        return new HtmlString(__($key, array_map(self::literal(...), $literals)));
    }
}
