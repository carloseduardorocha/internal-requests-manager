<?php

namespace App\Models;

use App\Enums\InternalRequestPriority;
use App\Enums\InternalRequestStatus;
use App\Enums\Role;
use Database\Factories\InternalRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property InternalRequestPriority $priority
 * @property InternalRequestStatus $status
 * @property Carbon|null $assigned_at
 * @property Carbon|null $decided_at
 */
#[Fillable(['title', 'description', 'priority', 'status', 'requester_id', 'area_id'])]
class InternalRequest extends Model
{
    /** @use HasFactory<InternalRequestFactory> */
    use HasFactory, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'priority' => InternalRequestPriority::class,
            'status' => InternalRequestStatus::class,
            'assigned_at' => 'datetime',
            'decided_at' => 'datetime',
        ];
    }

    /**
     * Only an open request can be edited or deleted.
     */
    public function isOpen(): bool
    {
        return $this->status === InternalRequestStatus::Open;
    }

    /**
     * Requesters see only their own requests; analysts and admins see all.
     *
     * @param  Builder<InternalRequest>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        if ($user->role === Role::Requester) {
            $query->where('requester_id', $user->id);
        }
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    /**
     * @return BelongsTo<Area, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * @return HasMany<InternalRequestStatusChange, $this>
     */
    public function statusChanges(): HasMany
    {
        return $this->hasMany(InternalRequestStatusChange::class)->orderBy('created_at')->orderBy('id');
    }
}
