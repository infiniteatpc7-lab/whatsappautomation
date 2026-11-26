'use client';

import { SubmitEvent, useCallback, useEffect, useState } from 'react';
import { useChatStore } from '../utils/store';
import type { Attachment } from '../utils/types';
import { ConversationList } from './conversation-list';
import { ChatArea } from './chat-area';
import { NewChatDialog } from './new-chat-dialog';
import { IconBrandWhatsapp } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface MessengerProps {
  activePhoneNumber?: string | null;
}

export function Messenger({ activePhoneNumber }: MessengerProps) {
  const {
    conversations,
    selectedConversationId,
    draft,
    selectConversation,
    setDraft,
    sendMessage,
    getActiveConversation,
  } = useChatStore();

  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsConversationId, setAttachmentsConversationId] =
    useState(selectedConversationId);

  if (attachmentsConversationId !== selectedConversationId) {
    setAttachmentsConversationId(selectedConversationId);
    setAttachments([]);
  }

  const handleSelect = (id: string) => {
    selectConversation(id);
    setMobileView('chat');
  };

  const handleBack = () => {
    setMobileView('list');
  };

  const handleAddAttachments = useCallback((files: FileList) => {
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSubmit = useCallback(
    (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const active = getActiveConversation() || conversations[0];
      if ((!draft.trim() && attachments.length === 0) || !active) return;

      sendMessage(draft, attachments.length > 0 ? attachments : undefined);
      setAttachments([]);
    },
    [draft, attachments, conversations, getActiveConversation, sendMessage]
  );

  // If there are zero conversations in the workspace yet:
  if (conversations.length === 0) {
    return (
      <div className='border-border/50 bg-background/70 flex flex-col items-center justify-center min-h-[480px] w-full p-8 text-center rounded-2xl border backdrop-blur-xl'>
        <div className='flex size-14 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#25D366] mb-4 shadow-sm'>
          <IconBrandWhatsapp className='size-8' />
        </div>
        <h3 className='text-lg font-semibold text-foreground'>WhatsApp Inbox Ready</h3>
        <p className='text-sm text-muted-foreground max-w-md mt-1 mb-6'>
          {activePhoneNumber ? (
            <>
              Your WhatsApp Business number <span className='font-mono font-medium text-foreground'>{activePhoneNumber}</span> is active. Incoming customer messages will appear here live.
            </>
          ) : (
            <>Your WhatsApp Business API is connected. Incoming customer messages will appear here live in real-time.</>
          )}
        </p>
        <NewChatDialog />
      </div>
    );
  }

  const activeConversation = getActiveConversation() || conversations[0];

  return (
    <div className='border-border/50 bg-background/70 sm:bg-transparent relative flex flex-col h-full min-h-0 w-full overflow-hidden rounded-none border-0 p-0 backdrop-blur-xl sm:backdrop-blur-none lg:grid lg:[grid-template-columns:340px_1fr] lg:gap-3'>
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversationId || activeConversation.id}
        onSelect={handleSelect}
        className={cn('h-full w-full', mobileView === 'chat' ? 'hidden lg:flex' : 'flex')}
      />
      <ChatArea
        conversation={activeConversation}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
        attachments={attachments}
        onAddAttachments={handleAddAttachments}
        onRemoveAttachment={handleRemoveAttachment}
        onBack={handleBack}
        className={cn('h-full w-full', mobileView === 'list' ? 'hidden lg:flex' : 'flex')}
      />
    </div>
  );
}
