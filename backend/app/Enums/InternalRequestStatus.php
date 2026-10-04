<?php

namespace App\Enums;

enum InternalRequestStatus: string
{
    case Open = 'open';
    case InReview = 'in_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
