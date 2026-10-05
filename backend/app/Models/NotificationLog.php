<?php

namespace App\Models;

use App\Enums\NotificationChannel;
use App\Enums\NotificationEvent;
use App\Enums\NotificationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['internal_request_id', 'channel', 'event', 'attempt', 'status', 'error'])]
class NotificationLog extends Model
{
    public const UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'channel' => NotificationChannel::class,
            'event' => NotificationEvent::class,
            'status' => NotificationStatus::class,
            'attempt' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<InternalRequest, $this>
     */
    public function internalRequest(): BelongsTo
    {
        return $this->belongsTo(InternalRequest::class);
    }
}
