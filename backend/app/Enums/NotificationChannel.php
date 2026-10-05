<?php

namespace App\Enums;

enum NotificationChannel: string
{
    case Discord = 'discord';
    case Mail = 'mail';
}
