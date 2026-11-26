'use client';

import { Icons } from '@/components/icons';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { FilePreview } from '@/components/ui/file-preview';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Message } from '../utils/types';

interface MessageBubbleProps {
  message: Message;
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

function getHostname(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return urlStr;
  }
}

function renderFormattedText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target='_blank'
          rel='noopener noreferrer'
          className='underline text-sky-600 dark:text-[#21c063] hover:opacity-80'
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const shouldReduceMotion = useReducedMotion();
  const isUser = message.sender === 'user';
  const urlMatch = message.text ? extractUrl(message.text) : null;
  const hostname = urlMatch ? getHostname(urlMatch) : null;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
      role='group'
      aria-label={'Message at ' + message.timestamp}
    >
      <div
        className={cn(
          'relative max-w-[85%] sm:max-w-[70%] px-2.5 py-1.5 sm:px-3 sm:py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] transition-all',
          isUser
            ? 'mr-2 rounded-lg rounded-tr-none bg-[#d9fdd3] text-[#111b21] dark:bg-[#144d37] dark:text-[#e9edef]'
            : 'ml-2 rounded-lg rounded-tl-none bg-white text-[#111b21] dark:bg-[#242626] dark:text-[#e9edef]'
        )}
      >
        {/* WhatsApp Curved Speech Bubble Tail */}
        <svg
          className={cn(
            'absolute top-0 w-2 h-[13px] pointer-events-none',
            isUser
              ? '-right-[7px] scale-x-[-1] text-[#d9fdd3] dark:text-[#144d37]'
              : '-left-[7px] text-white dark:text-[#242626]'
          )}
          viewBox='0 0 8 13'
          fill='currentColor'
        >
          <path d='M1.533 3.568L8 12.19V0H2.883a2 2 0 0 0-1.35.532l-.001.001a1.996 1.996 0 0 0-.001 2.825l.002.001v.209z' />
        </svg>
        {/* Rich Link Preview Card (Matching WhatsApp Web) */}
        {urlMatch && hostname && (
          <a
            href={urlMatch}
            target='_blank'
            rel='noopener noreferrer'
            className={cn(
              'mb-1.5 block rounded-md p-2 transition-opacity hover:opacity-90',
              isUser
                ? 'bg-black/5 dark:bg-[#103e2c]'
                : 'bg-black/5 dark:bg-[#1d1f1f]'
            )}
          >
            <p className='text-xs font-semibold truncate text-[#111b21] dark:text-[#e9edef]'>
              {hostname}
            </p>
            <p className='text-[11px] text-muted-foreground dark:text-white/65 truncate'>
              {urlMatch}
            </p>
            <p className='text-[10px] text-muted-foreground dark:text-white/60 truncate'>
              {hostname}
            </p>
          </a>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <FilePreview
            files={message.attachments.map((a) => ({
              id: a.id,
              name: a.name,
              type: a.type,
            }))}
            variant={isUser ? 'inverted' : 'default'}
            className='mb-1.5 p-0'
          />
        )}

        {/* Message Content & Inline/Bottom-Right Timestamp */}
        <div className='flex flex-wrap items-end justify-between gap-x-2.5 gap-y-0.5'>
          {message.text && (
            <span className='whitespace-pre-wrap break-words text-[13.5px] sm:text-[14px] leading-[19px] tracking-normal'>
              {renderFormattedText(message.text)}
            </span>
          )}

          {/* Timestamp & Status Checkmark (Floated/aligned neatly right like WhatsApp) */}
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px] leading-none shrink-0 select-none ml-auto self-end pt-0.5',
              isUser
                ? 'text-[#667781] dark:text-[#8696a0]'
                : 'text-[#667781] dark:text-[#8696a0]'
            )}
          >
            <span>{message.timestamp}</span>
            {isUser && (
              message.status === 'read' ? (
                <Icons.checks className='size-3.5 text-[#53bdeb]' title='Read' />
              ) : message.status === 'delivered' ? (
                <Icons.checks className='size-3.5 text-[#667781] dark:text-[#8696a0]' title='Delivered' />
              ) : message.status === 'pending' ? (
                <Icons.spinner className='size-2.5 animate-spin text-[#667781] dark:text-[#8696a0]' title='Sending...' />
              ) : message.status === 'failed' ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type='button'
                        className='inline-flex items-center cursor-help focus:outline-hidden'
                        aria-label='Delivery Failed'
                      >
                        <Icons.warning className='size-3 text-red-500 hover:text-red-400 transition-colors' />
                      </button>
                    }
                  />
                  <TooltipContent
                    side='top'
                    align='end'
                    className='max-w-[270px] flex flex-col items-start gap-1 p-2.5 text-left shadow-lg'
                  >
                    <div className='flex items-center gap-1.5 text-xs font-semibold text-red-500 dark:text-red-400 whitespace-nowrap'>
                      <Icons.warning className='size-3.5 shrink-0' />
                      <span>Delivery Failed</span>
                    </div>
                    <p className='text-[11px] leading-relaxed text-background/90 font-normal'>
                      {message.error_code === '131047'
                        ? 'Customer 24h service window was closed. A pre-approved Template message was required.'
                        : (message.error_message ? `Failed: ${message.error_message}` : 'Delivery rejected by Meta WhatsApp Cloud API.')}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Icons.check className='size-3.5 text-[#667781] dark:text-[#8696a0]' title='Sent' />
              )
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
