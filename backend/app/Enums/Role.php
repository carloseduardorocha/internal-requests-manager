<?php

namespace App\Enums;

enum Role: string
{
    case Requester = 'requester';
    case Analyst = 'analyst';
    case Admin = 'admin';
}
