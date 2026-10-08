<?php

namespace App\Actions\Auth;

use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Auth;
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
            $this->throttled($key);
        }

        // Counts the attempt before checking the password, so parallel requests cannot exceed the limit.
        if (RateLimiter::hit($key, $decaySeconds) > $maxAttempts) {
            $this->throttled($key);
        }

        if (! Auth::guard('web')->attempt([
            'email' => $email,
            'password' => $password,
            // A deactivated account fails like a wrong password, without saying why.
            'active' => fn ($query) => $query->whereNull('deactivated_at'),
        ], $remember)) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();
    }

    /**
     * @throws ThrottleRequestsException
     */
    private function throttled(string $key): never
    {
        $seconds = RateLimiter::availableIn($key);

        throw new ThrottleRequestsException(
            __('auth.throttle', ['seconds' => $seconds]),
            null,
            ['Retry-After' => $seconds],
        );
    }
}
