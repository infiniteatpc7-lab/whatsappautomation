<?php

namespace App\Enums;

enum TemplateStatus: string
{
    case DRAFT = 'DRAFT';
    case PENDING = 'PENDING';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';
    case PAUSED = 'PAUSED';
    case DISABLED = 'DISABLED';
}
