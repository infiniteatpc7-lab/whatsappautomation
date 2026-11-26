import { create } from 'zustand';
import type { Attachment, Conversation, Message } from './types';
import { toast } from 'sonner';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

type ChatState = {
  conversations: Conversation[];
  selectedConversationId: string;
  draft: string;
  isLoadingMessages: boolean;
  isSending: boolean;

  setConversations: (conversations: Conversation[]) => void;
  selectConversation: (id: string) => void;
  setDraft: (text: string) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  pollActiveMessages: () => Promise<void>;
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  startNewConversation: (phone: string, name?: string, messageText?: string) => Promise<boolean>;
  refreshConversations: () => Promise<void>;
  getActiveConversation: () => Conversation | undefined;
};

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: [],
  selectedConversationId: '',
  draft: '',
  isLoadingMessages: false,
  isSending: false,

  setConversations: (incoming) => {
    const currentSelected = get().selectedConversationId;
    const nextSelected =
      incoming.some((c) => c.id === currentSelected)
        ? currentSelected
        : incoming[0]?.id ?? '';

    set({
      conversations: incoming,
      selectedConversationId: nextSelected,
    });

    if (nextSelected) {
      get().loadMessages(nextSelected);
    }
  },

  selectConversation: (id) => {
    set((state) => ({
      selectedConversationId: id,
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    }));

    // Trigger load of messages
    get().loadMessages(id);

    // Call mark as read in background
    fetch(`/dashboard/chat/conversations/${id}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-XSRF-TOKEN': getCsrfToken(),
      },
      credentials: 'same-origin',
    }).catch(() => {});
  },

  setDraft: (text) => set({ draft: text }),

  loadMessages: async (conversationId: string) => {
    if (!conversationId) return;
    set({ isLoadingMessages: true });
    try {
      const res = await fetch(`/dashboard/chat/conversations/${conversationId}/messages`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      set((state) => ({
        isLoadingMessages: false,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: data.messages || [],
                is_window_open: data.is_window_open ?? c.is_window_open,
                window_expires_at: data.window_expires_at ?? c.window_expires_at,
              }
            : c
        ),
      }));
    } catch {
      set({ isLoadingMessages: false });
    }
  },

  pollActiveMessages: async () => {
    const selectedId = get().selectedConversationId;
    if (!selectedId) return;

    try {
      const res = await fetch(`/dashboard/chat/conversations/${selectedId}/messages`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = await res.json();
      const serverMessages: Message[] = data.messages || [];

      set((state) => {
        const conv = state.conversations.find((c) => c.id === selectedId);
        if (!conv) return state;

        const currentMsgs = conv.messages || [];
        const hasDiff =
          serverMessages.length !== currentMsgs.length ||
          serverMessages.some((sm, idx) => {
            const cm = currentMsgs[idx];
            return !cm || cm.id !== sm.id || cm.status !== sm.status;
          });

        if (!hasDiff) return state;

        return {
          conversations: state.conversations.map((c) =>
            c.id === selectedId
              ? {
                  ...c,
                  messages: serverMessages,
                  is_window_open: data.is_window_open ?? c.is_window_open,
                  window_expires_at: data.window_expires_at ?? c.window_expires_at,
                }
              : c
          ),
        };
      });
    } catch {
      // Ignore background poll errors
    }
  },

  sendMessage: async (text: string, attachments?: Attachment[]) => {
    const state = get();
    const active = state.getActiveConversation();
    if (!active) return;
    const conversationId = active.id;

    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = 'temp-' + Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      sender: 'user',
      author: 'You',
      text: trimmed,
      status: 'pending',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    // Optimistically update UI
    set({
      draft: '',
      isSending: true,
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [...c.messages, optimisticMessage],
              title: trimmed,
            }
          : c
      ),
    });

    try {
      const res = await fetch(`/dashboard/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ body: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg =
          data.errors?.body?.[0] || data.message || 'Failed to send WhatsApp message.';
        toast.error(errorMsg);
        set((curr) => ({
          isSending: false,
          conversations: curr.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === tempId ? { ...m, status: 'failed' } : m
                  ),
                }
              : c
          ),
        }));
        return;
      }

      // Replace optimistic message with confirmed server message
      set((curr) => ({
        isSending: false,
        conversations: curr.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) => (m.id === tempId ? data : m)),
              }
            : c
        ),
      }));
    } catch {
      toast.error('Network error sending message.');
      set((curr) => ({
        isSending: false,
        conversations: curr.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === tempId ? { ...m, status: 'failed' } : m
                ),
              }
            : c
        ),
      }));
    }
  },

  startNewConversation: async (phone: string, name?: string, messageText?: string) => {
    try {
      const payload: Record<string, string> = { phone: phone.trim() };
      if (name?.trim()) payload.name = name.trim();
      if (messageText?.trim()) payload.message = messageText.trim();

      const res = await fetch('/dashboard/chat/conversations/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg =
          data.errors?.message?.[0] ||
          data.errors?.phone?.[0] ||
          data.message ||
          'Failed to start conversation.';
        toast.error(errMsg);
        return false;
      }

      toast.success('WhatsApp conversation created!');
      const newConv: Conversation = {
        ...data.conversation,
        messages: data.message ? [data.message] : [],
      };

      set((state) => ({
        conversations: [newConv, ...state.conversations.filter((c) => c.id !== newConv.id)],
        selectedConversationId: newConv.id,
      }));

      return true;
    } catch {
      toast.error('Network error starting conversation.');
      return false;
    }
  },

  refreshConversations: async () => {
    try {
      const res = await fetch('/dashboard/chat/conversations', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data: Conversation[] = await res.json();
      set((state) => {
        const updated = data.map((remote) => {
          const existing = state.conversations.find((c) => c.id === remote.id);
          return {
            ...remote,
            messages: existing?.messages?.length ? existing.messages : (remote.messages || []),
          };
        });
        return {
          conversations: updated,
          selectedConversationId:
            state.selectedConversationId || updated[0]?.id || '',
        };
      });
    } catch {
      // Ignore background refresh errors
    }
  },

  getActiveConversation: () => {
    const state = get();
    return state.conversations.find((c) => c.id === state.selectedConversationId);
  },
}));
