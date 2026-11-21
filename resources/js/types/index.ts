import { Icons } from '@/components/icons';

export interface PermissionCheck {
  permission?: string;
  plan?: string;
  feature?: string;
  role?: string;
  requireOrg?: boolean;
}

export interface NavItem {
  title: string;
  url: string;
  disabled?: boolean;
  external?: boolean;
  shortcut?: [string, string];
  icon?: keyof typeof Icons;
  label?: string;
  description?: string;
  isActive?: boolean;
  badge?: string | number;
  items?: NavItem[];
  access?: PermissionCheck;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[];
}

export interface NavItemWithOptionalChildren extends NavItem {
  items?: NavItemWithChildren[];
}

export interface FooterItem {
  title: string;
  items: {
    title: string;
    href: string;
    external?: boolean;
  }[];
}

export type MainNavItem = NavItemWithOptionalChildren;

export type SidebarNavItem = NavItemWithChildren;

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  current_workspace_id: number | null;
  email_verified: boolean;
  two_factor_enabled: boolean;
}

export interface AuthWorkspace {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  timezone: string;
  plan: string;
  role: string;
  has_whatsapp: boolean;
}

export interface SharedProps {
  auth: {
    user: AuthUser | null;
    workspace: AuthWorkspace | null;
    workspaces: AuthWorkspace[];
  };
  flash: {
    success?: string | null;
    error?: string | null;
    status?: string | null;
  };
  [key: string]: unknown;
}
