<?php

// Router for the built-in server: the framework's own server.php prints a text line per request, which breaks the JSON-only logs.
$publicPath = dirname(__DIR__).'/public';

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

// Emulates Apache's "mod_rewrite": real files under public/ are served as they are.
if ($uri !== '/' && file_exists($publicPath.$uri)) {
    return false;
}

require_once $publicPath.'/index.php';
