<?php

namespace App\Enums;

enum TemplateStatus: string
{
    case DRAFT = 'DRAFT';
    case PENDING = 'PENDING';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';
    case IN_APPEAL = 'IN_APPEAL';
    case PAUSED = 'PAUSED';
    case DISABLED = 'DISABLED';
}
