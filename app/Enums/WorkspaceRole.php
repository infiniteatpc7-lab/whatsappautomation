<?php

namespace App\Enums;

enum WorkspaceRole: string
{
    case OWNER = 'owner';
    case ADMIN = 'admin';
    case MANAGER = 'manager';
    case AGENT = 'agent';
    case SUPERVISOR = 'supervisor';

    public function isAdminOrOwner(): bool
    {
        return in_array($this, [self::OWNER, self::ADMIN], true);
    }

    public function canManageTeam(): bool
    {
        return in_array($this, [self::OWNER, self::ADMIN], true);
    }

    public function canManageWhatsApp(): bool
    {
        return in_array($this, [self::OWNER, self::ADMIN, self::MANAGER], true);
    }
}
