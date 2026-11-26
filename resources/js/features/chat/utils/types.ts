export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type MessageStatusType = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type Message = {
  id: string;
  wamid?: string | null;
  sender: 'user' | 'contact';
  author: string;
  text: string;
  type?: string;
  status?: MessageStatusType;
  error_code?: string | null;
  error_message?: string | null;
  timestamp: string;
  created_at?: string;
  attachments?: Attachment[];
};

export type ConversationStatus = 'online' | 'offline';

export type Conversation = {
  id: string;
  uuid?: string;
  name: string;
  phone?: string;
  avatar?: string | null;
  title: string;
  status: ConversationStatus;
  unread: number;
  initials: string;
  is_window_open?: boolean;
  window_expires_at?: string | null;
  last_message_at?: string;
  last_message?: Message | null;
  messages: Message[];
  quickReplies?: string[];
  autoReplies?: string[];
};

export function formatWhatsAppTimestamp(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();

  // Midnight for accurate calendar-day difference
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const diffMs = today - target;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today -> format like "06:03" or "11:34 am"
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } else if (diffDays === 1) {
    // Yesterday
    return 'Yesterday';
  } else if (diffDays > 1 && diffDays < 7) {
    // Within last 6 days -> Weekday name (e.g. "Monday", "Saturday")
    return date.toLocaleDateString([], { weekday: 'long' });
  } else {
    // Older -> DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

export function formatWhatsAppDateBadge(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const diffMs = today - target;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

const WA_AVATAR_PALETTE = [
  'text-pink-600 dark:text-pink-400 bg-pink-500/15',
  'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15',
  'text-sky-600 dark:text-sky-400 bg-sky-500/15',
  'text-amber-600 dark:text-amber-400 bg-amber-500/15',
  'text-purple-600 dark:text-purple-400 bg-purple-500/15',
  'text-cyan-600 dark:text-cyan-400 bg-cyan-500/15',
  'text-rose-600 dark:text-rose-400 bg-rose-500/15',
  'text-indigo-600 dark:text-indigo-400 bg-indigo-500/15',
] as const;

export function getWhatsAppAvatarColor(name: string): string {
  let hash = 0;
  const str = name || 'User';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return WA_AVATAR_PALETTE[Math.abs(hash) % WA_AVATAR_PALETTE.length];
}
