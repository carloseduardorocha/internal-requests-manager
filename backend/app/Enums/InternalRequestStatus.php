<?php

namespace App\Enums;

enum InternalRequestStatus: string
{
    case Open = 'open';
    case InReview = 'in_review';
    case Approved = 'approved';
    case Rejected = 'rejected';

    /**
     * The only allowed flow: Open -> InReview -> Approved or Rejected. Decisions are final.
     */
    public function canTransitionTo(self $next): bool
    {
        return match ($this) {
            self::Open => $next === self::InReview,
            self::InReview => $next === self::Approved || $next === self::Rejected,
            self::Approved, self::Rejected => false,
        };
    }
}
