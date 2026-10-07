<?php

namespace App\Models;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Notifications\ResetPasswordNotification;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * @property Role $role
 * @property Carbon|null $deactivated_at
 */
#[Fillable(['name', 'email', 'password', 'role', 'area_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => Role::class,
            'deactivated_at' => 'datetime',
        ];
    }

    public function isActive(): bool
    {
        return $this->deactivated_at === null;
    }

    public function status(): AccountStatus
    {
        return $this->isActive() ? AccountStatus::Active : AccountStatus::Deactivated;
    }

    /**
     * @param  Builder<User>  $query
     */
    public function scopeWithStatus(Builder $query, AccountStatus $status): void
    {
        $status === AccountStatus::Active
            ? $query->whereNull('deactivated_at')
            : $query->whereNotNull('deactivated_at');
    }

    /**
     * Ends every session and "remember me" cookie of the account. Does not save: the caller decides when.
     */
    public function logOutEverywhere(): void
    {
        DB::table((string) config('session.table'))->where('user_id', $this->getKey())->delete();
        $this->setRememberToken(Str::random(60));
    }

    /**
     * Queues the reset mail with the app's own notification instead of the framework's.
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * @return BelongsTo<Area, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * @return HasMany<InternalRequest, $this>
     */
    public function internalRequests(): HasMany
    {
        return $this->hasMany(InternalRequest::class, 'requester_id');
    }
}
