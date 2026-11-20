<?php

namespace App\Enums;

enum OptInStatus: string
{
    case OPTED_IN = 'opted_in';
    case OPTED_OUT = 'opted_out';
    case UNKNOWN = 'unknown';
}
