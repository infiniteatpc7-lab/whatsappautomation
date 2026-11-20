<?php

namespace App\Enums;

enum WorkspacePlan: string
{
    case STARTER = 'starter';
    case GROWTH = 'growth';
    case PRO = 'pro';
    case ENTERPRISE = 'enterprise';
}
