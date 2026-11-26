'use client';

import { useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Conversation } from '../utils/types';
import { formatWhatsAppTimestamp, getWhatsAppAvatarColor } from '../utils/types';
import { NewChatDialog } from './new-chat-dialog';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function ConversationList({ conversations, selectedId, onSelect, className }: ConversationListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) => c.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  return (
    <div className={cn('border-border/40 bg-background/75 h-full min-h-0 flex-col gap-4 overflow-hidden rounded-2xl border p-3 backdrop-blur lg:col-start-1 lg:col-end-2 lg:flex lg:rounded-3xl lg:p-4', className)}>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='text-foreground text-sm font-semibold'>WhatsApp Inbox</p>
          <p className='text-muted-foreground text-xs'>
            {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
          </p>
        </div>
        <NewChatDialog />
      </div>

      <label htmlFor='messenger-search' className='sr-only'>
        Search conversations
      </label>
      <div className='relative'>
        <Icons.search
          className='text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2'
          aria-hidden='true'
        />
        <Input
          id='messenger-search'
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search conversations'
          className='border-border/40 bg-background/60 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/40 w-full rounded-2xl pl-10 text-sm focus-visible:ring-2'
        />
      </div>

      <div
        className='flex-1 space-y-1 overflow-y-auto pr-1'
        aria-label='Conversation list'
        role='list'
      >
        {filtered.length === 0 ? (
          <p className='text-muted-foreground py-8 text-center text-xs'>No conversations found</p>
        ) : null}
        {filtered.map((conversation) => {
          const isActive = conversation.id === selectedId;
          const lastMessage =
            (conversation.messages && conversation.messages.length > 0
              ? conversation.messages[conversation.messages.length - 1]
              : conversation.last_message) || null;

          const displayTime = formatWhatsAppTimestamp(
            lastMessage?.created_at || conversation.last_message_at
          );

          const isPhoto =
            lastMessage?.type === 'image' ||
            lastMessage?.text === '[Image]' ||
            lastMessage?.text?.toLowerCase() === 'photo';

          const isVideo =
            lastMessage?.type === 'video' ||
            lastMessage?.text === '[Video]' ||
            lastMessage?.text?.toLowerCase() === 'video';

          const isDoc =
            lastMessage?.type === 'document' ||
            lastMessage?.text?.toLowerCase().startsWith('[document]');

          const isAudio =
            lastMessage?.type === 'audio' ||
            lastMessage?.text === '[Audio]';

          return (
            <motion.button
              key={conversation.id}
              type='button'
              onClick={() => onSelect(conversation.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 h-[72px] text-left select-none cursor-pointer',
                'touch-manipulation [-webkit-tap-highlight-color:transparent]',
                'transition-[background-color,transform] duration-100 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                'bg-transparent hover:bg-muted/60 dark:hover:bg-[#242626]/70 active:bg-muted/80 dark:active:bg-[#242626] active:scale-[0.985] md:active:scale-100 text-foreground'
              )}
              role='listitem'
            >
              {/* Circular Avatar */}
              <div className='relative shrink-0'>
                <Avatar className='h-12 w-12 rounded-full overflow-hidden'>
                  {conversation.avatar && (
                    <AvatarImage
                      src={conversation.avatar}
                      alt={conversation.name}
                      className='h-full w-full object-cover rounded-full'
                    />
                  )}
                  <AvatarFallback
                    className={cn(
                      'rounded-full text-base font-semibold select-none flex items-center justify-center',
                      getWhatsAppAvatarColor(conversation.name)
                    )}
                  >
                    {(conversation.name.trim()[0] || 'W').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {conversation.status === 'online' && (
                  <span
                    className='border-background absolute right-0 bottom-0 inline-flex h-3.5 w-3.5 rounded-full border-2 bg-emerald-500'
                    aria-label='Online'
                  />
                )}
              </div>

              {/* Text Info */}
              <div className='min-w-0 flex-1 space-y-1'>
                {/* Top Row: Name and Dynamic Time */}
                <div className='flex items-center justify-between gap-1.5'>
                  <p className='text-foreground text-sm font-medium truncate'>
                    {conversation.name}
                  </p>
                  {displayTime && (
                    <span
                      className={cn(
                        'shrink-0 text-xs transition-colors',
                        conversation.unread > 0 ? 'text-emerald-500 font-medium' : 'text-muted-foreground/80'
                      )}
                    >
                      {displayTime}
                    </span>
                  )}
                </div>

                {/* Bottom Row: Checkmarks + Media/Snippet + Unread Badge / Dropdown Chevron */}
                <div className='flex items-center justify-between gap-1.5'>
                  <div className='flex items-center gap-1.5 text-muted-foreground/80 text-xs truncate min-w-0'>
                    {lastMessage ? (
                      <>
                        {lastMessage.sender === 'user' && (
                          <span className='inline-flex shrink-0'>
                            {lastMessage.status === 'read' ? (
                              <Icons.checks className='h-4 w-4 text-[#53bdeb]' />
                            ) : lastMessage.status === 'delivered' ? (
                              <Icons.checks className='h-4 w-4 text-muted-foreground/80' />
                            ) : lastMessage.status === 'failed' ? (
                              <Icons.alertCircle
                                className='h-3.5 w-3.5 text-destructive'
                                title={lastMessage.error_message ? `Failed: ${lastMessage.error_message}` : 'Message delivery failed'}
                              />
                            ) : (
                              <Icons.check className='h-4 w-4 text-muted-foreground/80' />
                            )}
                          </span>
                        )}

                        {isPhoto ? (
                          <span className='inline-flex items-center gap-1 truncate'>
                            <Icons.media className='h-3.5 w-3.5 shrink-0' />
                            <span className='truncate'>Photo</span>
                          </span>
                        ) : isVideo ? (
                          <span className='inline-flex items-center gap-1 truncate'>
                            <Icons.video className='h-3.5 w-3.5 shrink-0' />
                            <span className='truncate'>Video</span>
                          </span>
                        ) : isDoc ? (
                          <span className='inline-flex items-center gap-1 truncate'>
                            <Icons.post className='h-3.5 w-3.5 shrink-0' />
                            <span className='truncate'>{lastMessage.text.replace(/^\[Document\]\s*/i, '')}</span>
                          </span>
                        ) : isAudio ? (
                          <span className='inline-flex items-center gap-1 truncate'>
                            <Icons.music className='h-3.5 w-3.5 shrink-0' />
                            <span className='truncate'>Voice message</span>
                          </span>
                        ) : (
                          <span className='truncate'>{lastMessage.text}</span>
                        )}
                      </>
                    ) : (
                      <span className='font-mono text-[11px] opacity-75 truncate'>{conversation.phone}</span>
                    )}
                  </div>

                  <div className='flex items-center gap-1.5 shrink-0'>
                    {conversation.unread > 0 && (
                      <span className='inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-[#25d366] text-white text-[11px] font-bold shadow-xs'>
                        {conversation.unread}
                      </span>
                    )}
                    <Icons.chevronDown
                      className='h-4 w-4 text-muted-foreground/60 transition-opacity duration-150 shrink-0 opacity-0 group-hover:opacity-100'
                    />
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
