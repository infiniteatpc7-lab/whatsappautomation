'use client';

import { SubmitEvent, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Attachment, Conversation } from '../utils/types';
import { formatWhatsAppDateBadge } from '../utils/types';
import { ChatHeader } from './chat-header';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useChatStore } from '../utils/store';

interface ChatAreaProps {
  conversation: Conversation;
  draft: string;
  onDraftChange: (text: string) => void;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  attachments: Attachment[];
  onAddAttachments: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
  onBack?: () => void;
  className?: string;
}

export function ChatArea({
  conversation,
  draft,
  onDraftChange,
  onSubmit,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  onBack,
  className,
}: ChatAreaProps) {
  const shouldReduceMotion = useReducedMotion();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const { isLoadingMessages } = useChatStore();

  const isWindowOpen = conversation.is_window_open ?? true;

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const behavior = shouldReduceMotion ? 'auto' : 'smooth';

    const scrollToBottom = () => {
      container.scrollTo({ top: container.scrollHeight, behavior });
    };

    if (behavior === 'smooth') {
      requestAnimationFrame(scrollToBottom);
    } else {
      scrollToBottom();
    }
  }, [conversation.messages, shouldReduceMotion]);

  // Keep messages scrolled to bottom when mobile keyboard resizes viewport
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (!liveRegionRef.current) return;
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (!lastMessage) return;
    liveRegionRef.current.textContent =
      lastMessage.author + ' at ' + lastMessage.timestamp + ': ' + lastMessage.text;
  }, [conversation.messages]);

  return (
    <>
      <AnimatePresence initial={false} mode='wait'>
        <motion.div
          key={conversation.id}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className={cn('border-border/40 bg-background/80 flex h-full min-h-0 flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border backdrop-blur lg:col-start-2 lg:col-end-3 lg:rounded-3xl', className)}
        >
          <ChatHeader conversation={conversation} onBack={onBack} />

          {/* Main Chat Canvas with STICKY Fixed Wallpaper */}
          <div className='relative min-h-0 flex-1 overflow-hidden bg-[#efeae2] dark:bg-[#161717]'>
            {/* WhatsApp Doodle Wallpaper Layer (STICKY / FIXED - does not scroll) */}
            <div
              className='pointer-events-none absolute inset-0 z-0 bg-neutral-900/6 dark:bg-white/10'
              style={{
                maskImage: "url('/images/wa-bg.svg')",
                WebkitMaskImage: "url('/images/wa-bg.svg')",
                maskRepeat: 'repeat',
                WebkitMaskRepeat: 'repeat',
                maskSize: '540px 960px',
                WebkitMaskSize: '540px 960px',
                opacity: 0.65,
              }}
            />

            {/* Scrollable Messages Viewport (scrolls above the fixed wallpaper) */}
            <div
              ref={messagesContainerRef}
              className={cn(
                'absolute inset-0 z-10 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-4 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/30',
                !isWindowOpen && 'pb-10 sm:pb-10'
              )}
              aria-live='off'
              aria-label={'Message thread with ' + conversation.name}
            >
              {isLoadingMessages && conversation.messages.length === 0 ? (
                <div className='flex h-full items-center justify-center py-12 text-muted-foreground'>
                  <Icons.spinner className='size-5 animate-spin mr-2' />
                  <span className='text-xs'>Loading conversation history...</span>
                </div>
              ) : conversation.messages.length === 0 ? (
                <div className='flex flex-col h-full items-center justify-center py-12 text-center text-muted-foreground'>
                  <p className='text-xs'>No messages yet in this conversation.</p>
                  <p className='text-[11px] mt-1'>Type below to send an outbound WhatsApp message.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {conversation.messages.map((message, idx) => {
                    const prevMessage = conversation.messages[idx - 1];
                    const currentDate = message.created_at ? formatWhatsAppDateBadge(message.created_at) : null;
                    const prevDate = prevMessage?.created_at ? formatWhatsAppDateBadge(prevMessage.created_at) : null;
                    const showDateBadge = currentDate && currentDate !== prevDate;

                    return (
                      <div key={message.id}>
                        {showDateBadge && (
                          <div className='flex justify-center my-2.5 select-none sticky top-1 z-10'>
                            <span className='rounded-lg bg-white/90 dark:bg-[#242626] px-3 py-1 text-[11px] font-medium text-[#54656f] dark:text-[#8696a0] shadow-xs'>
                              {currentDate}
                            </span>
                          </div>
                        )}
                        <MessageBubble message={message} />
                      </div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {!isWindowOpen && (
              <div className='pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center px-3 select-none'>
                <p className='text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-center'>
                  <Icons.warning className='size-3.5 shrink-0' />
                  <span>
                    <strong>24-hour window expired:</strong> Meta requires the customer to message you before free-form text can be delivered.
                  </span>
                </p>
              </div>
            )}
          </div>

          <MessageComposer
            draft={draft}
            onDraftChange={onDraftChange}
            onSubmit={onSubmit}
            contactName={conversation.name}
            attachments={attachments}
            onAddAttachments={onAddAttachments}
            onRemoveAttachment={onRemoveAttachment}
          />
        </motion.div>
      </AnimatePresence>
      <div ref={liveRegionRef} className='sr-only' aria-live='polite' aria-atomic='true' />
    </>
  );
}
