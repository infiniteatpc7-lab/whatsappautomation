<?php

namespace App\Enums;

enum WorkspaceRole: string
{
    case OWNER = 'owner';
    case ADMIN = 'admin';
    case AGENT = 'agent';
    case SUPERVISOR = 'supervisor';
}
