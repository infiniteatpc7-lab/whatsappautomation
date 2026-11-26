import { NavGroup } from '@/types';

/**
 * Navigation configuration with RBAC support
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Dashboard',
    items: [
      {
        title: 'Overview',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'Templates',
        url: '/dashboard/templates',
        icon: 'product',
        shortcut: ['t', 't'],
        isActive: false,
        items: []
      },
      {
        title: 'Broadcasts',
        url: '/dashboard/broadcasts',
        icon: 'send',
        shortcut: ['b', 'b'],
        isActive: false,
        items: []
      },
      {
        title: 'MCP',
        url: '#',
        icon: 'code',
        badge: 'PRO',
        shortcut: ['m', 'm'],
        isActive: false,
        items: []
      },
      {
        title: 'Contacts',
        url: '/dashboard/contacts',
        icon: 'teams',
        shortcut: ['c', 'o'],
        isActive: false,
        items: []
      },
      {
        title: 'Live Chat',
        url: '/dashboard/chat',
        icon: 'chat',
        shortcut: ['c', 'c'],
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Elements',
    items: [
      {
        title: 'Product',
        url: '/dashboard/product',
        icon: 'product',
        shortcut: ['p', 'p'],
        isActive: false,
        items: []
      },
      {
        title: 'Users',
        url: '/dashboard/users',
        icon: 'teams',
        shortcut: ['u', 'u'],
        isActive: false,
        items: []
      },
      {
        title: 'Kanban',
        url: '/dashboard/kanban',
        icon: 'kanban',
        shortcut: ['k', 'k'],
        isActive: false,
        items: []
      },
      {
        title: 'AI Chat',
        url: '/dashboard/ai-chat',
        icon: 'sparkles',
        badge: 'NEW',
        shortcut: ['a', 'i'],
        isActive: false,
        items: []
      },
      {
        title: 'Notifications',
        url: '/dashboard/notifications',
        icon: 'notification',
        shortcut: ['n', 'n'],
        isActive: false,
        items: []
      },
      {
        title: 'Forms',
        url: '#',
        icon: 'forms',
        isActive: false,
        items: [
          {
            title: 'Basic Form',
            url: '/dashboard/forms/basic',
            icon: 'forms',
            shortcut: ['f', 'f']
          },
          {
            title: 'Multi-Step Form',
            url: '/dashboard/forms/multi-step',
            icon: 'forms'
          },
          {
            title: 'Sheet & Dialog',
            url: '/dashboard/forms/sheet-form',
            icon: 'forms'
          },
          {
            title: 'Advanced Patterns',
            url: '/dashboard/forms/advanced',
            icon: 'forms'
          }
        ]
      },
      {
        title: 'React Query',
        url: '/dashboard/react-query',
        icon: 'code',
        isActive: false,
        items: []
      },
      {
        title: 'Icons',
        url: '/dashboard/elements/icons',
        icon: 'palette',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Settings',
    items: [
      {
        title: 'Account',
        url: '/dashboard/account',
        icon: 'user',
        shortcut: ['a', 'c'],
        isActive: false,
        items: []
      },
      {
        title: 'Workspace',
        url: '/dashboard/workspace',
        icon: 'building',
        shortcut: ['w', 'w'],
        isActive: false,
        items: []
      }
    ]
  }
];
