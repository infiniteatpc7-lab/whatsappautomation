'use client';

import { SubmitEvent, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FilePreview } from '@/components/ui/file-preview';
import { EmojiPicker } from './emoji-picker';
import type { Attachment } from '../utils/types';

interface MessageComposerProps {
  draft: string;
  onDraftChange: (text: string) => void;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  contactName: string;
  quickReplies?: string[];
  attachments: Attachment[];
  onAddAttachments: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
}

export function MessageComposer({
  draft,
  onDraftChange,
  onSubmit,
  contactName,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
}: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const hasContent = draft.trim().length > 0 || attachments.length > 0;

  const handleSelectEmoji = (emoji: string) => {
    onDraftChange(draft + emoji);
  };

  return (
    <form onSubmit={onSubmit} className='relative w-full' aria-label='Reply composer'>
      <label htmlFor='messenger-editor' className='sr-only'>
        Write a message
      </label>

      {/* Floating Emoji Picker Popup */}
      <AnimatePresence>
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={handleSelectEmoji}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </AnimatePresence>

      {attachments.length > 0 && (
        <FilePreview
          files={attachments.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
          }))}
          onRemove={onRemoveAttachment}
          className='p-2 bg-[#f0f2f5] dark:bg-[#242626] border-t border-border/10'
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        aria-label='Add attachments'
        type='file'
        multiple
        className='hidden'
        onChange={(e) => {
          if (e.target.files?.length) {
            onAddAttachments(e.target.files);
          }
          e.target.value = '';
        }}
      />

      {/* WhatsApp Web Exact Typo Composer Bar in #242626 */}
      <div className='relative flex items-center gap-2 sm:gap-3 bg-[#f0f2f5] dark:bg-[#242626] px-3 py-2 sm:px-4 sm:py-2.5 border-t border-black/5 dark:border-white/5'>
        {/* Attach File Button (+) */}
        <button
          type='button'
          onClick={() => fileInputRef.current?.click()}
          className='text-muted-foreground/80 dark:text-[#8696a0] hover:text-foreground dark:hover:text-[#e9edef] p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer'
          title='Attach'
          aria-label='Attach a file'
        >
          <Icons.add className='size-6' />
        </button>

        {/* Smiley / Emoji Button (Toggles Emoji Picker) */}
        <button
          type='button'
          className='text-muted-foreground/80 dark:text-[#8696a0] hover:text-foreground dark:hover:text-[#e9edef] p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer'
          title='Emoji'
          aria-label='Emoji'
          onClick={() => setShowEmojiPicker((prev) => !prev)}
        >
          <Icons.smile className='size-6' />
        </button>

        {/* Center Input Bar (Exact WhatsApp Typo Pill) */}
        <div className='min-w-0 flex-1 flex items-center'>
          <Textarea
            id='messenger-editor'
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (hasContent) {
                  const form = e.currentTarget.closest('form');
                  form?.requestSubmit();
                }
              }
            }}
            placeholder='Type a message'
            rows={1}
            onFocus={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                // Ensure page doesn't scroll off-screen on mobile keyboard focus
                window.scrollTo(0, 0);
              }
            }}
            className='w-full resize-none border-none bg-white dark:bg-[#1a1c1c] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] rounded-lg px-3.5 py-2 text-sm focus-visible:ring-0 focus-visible:outline-none min-h-[38px] max-h-[100px] leading-normal shadow-xs'
            aria-label={'Message ' + contactName}
          />
        </div>

        {/* Right Action: Send Button or Microphone Icon */}
        {hasContent ? (
          <Button
            type='submit'
            size='icon'
            className='h-9 w-9 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white shrink-0 cursor-pointer shadow-sm transition-transform active:scale-95'
            aria-label='Send message'
          >
            <Icons.send className='h-4 w-4' aria-hidden='true' />
          </Button>
        ) : (
          <button
            type='button'
            className='text-muted-foreground/80 dark:text-[#8696a0] hover:text-foreground dark:hover:text-[#e9edef] p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer'
            title='Voice note'
            aria-label='Record voice note'
          >
            <Icons.mic className='size-6' />
          </button>
        )}
      </div>
    </form>
  );
}
