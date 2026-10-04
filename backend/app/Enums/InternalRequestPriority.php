<?php

namespace App\Enums;

enum InternalRequestPriority: string
{
    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';
}
