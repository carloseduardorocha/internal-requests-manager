<?php

namespace App\Models;

use App\Enums\Role;
use Carbon\CarbonImmutable;
use Database\Factories\InvitationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The token column holds the SHA-256 of the link token, never the token itself.
 *
 * @property Role $role
 * @property CarbonImmutable $expires_at
 * @property CarbonImmutable|null $accepted_at
 */
#[Fillable(['name', 'email', 'role', 'area_id', 'token', 'expires_at', 'accepted_at'])]
class Invitation extends Model
{
    /** @use HasFactory<InvitationFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => Role::class,
            'expires_at' => 'immutable_datetime',
            'accepted_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return BelongsTo<Area, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * The single rule of a usable invitation: not accepted, not expired and the e-mail still has no account.
     *
     * @param  Builder<Invitation>  $query
     */
    public function scopePending(Builder $query): void
    {
        $query->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->whereNotExists(fn ($users) => $users->from('users')->whereColumn('users.email', 'invitations.email'));
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function findPendingByToken(string $token): ?self
    {
        return static::query()->pending()->where('token', static::hashToken($token))->first();
    }
}
