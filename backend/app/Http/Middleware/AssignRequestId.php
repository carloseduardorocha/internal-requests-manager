<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AssignRequestId
{
    /**
     * Tags the request and its logs (jobs included, through the Context) with an id, and echoes it in the response.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $incoming = $request->header('X-Request-Id');

        // Only a short, plain value is trusted: anything else could inject log lines or bloat them.
        $requestId = is_string($incoming) && preg_match('/^[A-Za-z0-9._-]{1,128}\z/', $incoming) === 1
            ? $incoming
            : (string) Str::uuid();

        Context::add('request_id', $requestId);

        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
