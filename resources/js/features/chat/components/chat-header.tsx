'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { Conversation } from '../utils/types';
import { getWhatsAppAvatarColor } from '../utils/types';

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
}

export function ChatHeader({ conversation, onBack }: ChatHeaderProps) {
  const isWindowOpen = conversation.is_window_open ?? (conversation.status === 'online');

  return (
    <header className='flex items-center justify-between gap-3 sm:gap-4 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border/40 bg-background/80 shrink-0 select-none'>
      <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
        {onBack && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={onBack}
            className='lg:hidden -ml-1.5 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer'
            aria-label='Back to conversations'
          >
            <Icons.chevronLeft className='size-5' />
          </Button>
        )}
        <div className='relative shrink-0'>
          <Avatar className='border-border/40 bg-muted/60 text-foreground h-10 w-10 rounded-full border sm:h-12 sm:w-12 overflow-hidden'>
            {conversation.avatar && (
              <AvatarImage
                src={conversation.avatar}
                alt={conversation.name}
                className='h-full w-full object-cover rounded-full'
              />
            )}
            <AvatarFallback
              className={cn(
                'rounded-full text-sm font-semibold sm:text-base select-none flex items-center justify-center',
                getWhatsAppAvatarColor(conversation.name)
              )}
            >
              {(conversation.name.trim()[0] || 'W').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {conversation.status === 'online' && (
            <span
              className='border-background absolute right-0 bottom-0 inline-flex h-3 w-3 rounded-full border-2 bg-emerald-500 sm:h-3.5 sm:w-3.5'
              aria-label='Online'
            />
          )}
        </div>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <p className='text-foreground text-sm font-semibold sm:text-base truncate'>{conversation.name}</p>
          </div>
          <p className='text-muted-foreground text-xs font-mono truncate'>
            {conversation.phone || 'WhatsApp Contact'}
          </p>
        </div>
      </div>

      <div className='flex items-center gap-2 shrink-0'>
        {isWindowOpen ? (
          <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
            <span className='size-1.5 rounded-full bg-emerald-500' />
            24h Window Active
          </span>
        ) : (
          <span className='inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400' title='Customer must reply or template must be used'>
            <span className='size-1.5 rounded-full bg-amber-500' />
            Window Expired
          </span>
        )}
      </div>
    </header>
  );
}
