<?php

namespace App\Actions\Auth;

use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LogIn
{
    /**
     * Authenticates by session, blocking after too many wrong attempts per e-mail + IP.
     *
     * @throws ThrottleRequestsException
     * @throws ValidationException
     */
    public function handle(Request $request, string $email, string $password, bool $remember): void
    {
        $key = Str::transliterate(Str::lower($email).'|'.$request->ip());
        $maxAttempts = (int) config('auth.login_throttle.max_attempts');
        $decaySeconds = (int) config('auth.login_throttle.decay_minutes') * 60;

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);

            throw new ThrottleRequestsException(
                __('auth.throttle', ['seconds' => $seconds]),
                null,
                ['Retry-After' => $seconds],
            );
        }

        if (! Auth::guard('web')->attempt(['email' => $email, 'password' => $password], $remember)) {
            RateLimiter::hit($key, $decaySeconds);

            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();
    }
}
