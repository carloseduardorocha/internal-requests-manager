<?php

namespace App\Models;

use App\Enums\InternalRequestStatus;
use Database\Factories\InternalRequestStatusChangeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['internal_request_id', 'from_status', 'to_status', 'changed_by'])]
class InternalRequestStatusChange extends Model
{
    /** @use HasFactory<InternalRequestStatusChangeFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'from_status' => InternalRequestStatus::class,
            'to_status' => InternalRequestStatus::class,
        ];
    }

    /**
     * @return BelongsTo<InternalRequest, $this>
     */
    public function internalRequest(): BelongsTo
    {
        return $this->belongsTo(InternalRequest::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
