<?php

namespace App\Enums;

enum WorkspacePlan: string
{
    case FREE = 'free';
    case STARTER = 'starter';
    case GROWTH = 'growth';
    case PRO = 'pro';
    case AGENCY = 'agency';
    case ENTERPRISE = 'enterprise';
}
