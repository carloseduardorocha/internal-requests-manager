<?php

namespace App\Actions\Auth;

use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LogIn
{
    /**
     * Authenticates by session, blocking after too many wrong attempts per e-mail + IP.
     *
     * @throws TokenMismatchException
     * @throws ThrottleRequestsException
     * @throws ValidationException
     */
    public function handle(Request $request, string $email, string $password, bool $remember): void
    {
        // The API serves only the SPA, which always has a session (ADR 0004).
        if (! $request->hasSession()) {
            throw new TokenMismatchException;
        }

        $key = Str::transliterate(Str::lower($email).'|'.$request->ip());
        $maxAttempts = (int) config('auth.login_throttle.max_attempts');
        $decaySeconds = (int) config('auth.login_throttle.decay_minutes') * 60;

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $this->throttled($key, $request, $email);
        }

        // Counts the attempt before checking the password, so parallel requests cannot exceed the limit.
        if (RateLimiter::hit($key, $decaySeconds) > $maxAttempts) {
            $this->throttled($key, $request, $email);
        }

        if (! Auth::guard('web')->attempt([
            'email' => $email,
            'password' => $password,
            // A deactivated account fails like a wrong password, without saying why.
            'active' => fn ($query) => $query->whereNull('deactivated_at'),
        ], $remember)) {
            Log::info('auth.login_failed', $this->logContext($request, $email));

            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();
    }

    /**
     * @throws ThrottleRequestsException
     */
    private function throttled(string $key, Request $request, string $email): never
    {
        Log::warning('auth.login_throttled', $this->logContext($request, $email));

        $seconds = RateLimiter::availableIn($key);

        throw new ThrottleRequestsException(
            __('auth.throttle', ['seconds' => $seconds]),
            null,
            ['Retry-After' => $seconds],
        );
    }

    /**
     * The e-mail goes hashed, so attempts on the same account can be linked without exposing it.
     *
     * @return array{ip: string|null, email_hash: string}
     */
    private function logContext(Request $request, string $email): array
    {
        return [
            'ip' => $request->ip(),
            'email_hash' => hash('sha256', Str::lower($email)),
        ];
    }
}
