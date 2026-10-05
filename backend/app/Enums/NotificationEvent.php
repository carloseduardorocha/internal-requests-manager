<?php

namespace App\Enums;

enum NotificationEvent: string
{
    case Created = 'created';
    case Assigned = 'assigned';
    case Decided = 'decided';
}
