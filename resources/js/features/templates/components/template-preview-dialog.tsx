'use client';

import React from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { WhatsAppTemplate } from '../types';
import { IPhonePreview } from './iphone-preview';

interface TemplatePreviewDialogProps {
  template: WhatsAppTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
}: TemplatePreviewDialogProps) {
  if (!template) return null;

  const headerComponent = template.components?.find((c) => c.type === 'HEADER');
  const bodyComponent = template.components?.find((c) => c.type === 'BODY');
  const footerComponent = template.components?.find((c) => c.type === 'FOOTER');
  const buttonsComponent = template.components?.find((c) => c.type === 'BUTTONS');

  // Extract sample values from example.body_text if Meta provided them
  const sampleValues: string[] = bodyComponent?.example?.body_text?.[0] || [];

  const bodyRaw = bodyComponent?.text || template.body_text || '';
  const parts = bodyRaw.split(/(\{\{\d+\}\})/g);

  const bodyContent = parts.map((part, i) => {
    const match = part.match(/^\{\{(\d+)\}\}$/);
    if (match) {
      const varIndex = parseInt(match[1], 10) - 1;
      const sample = sampleValues[varIndex]?.trim();
      if (sample) {
        return (
          <span key={i} className='text-[#008069] dark:text-[#25D366] font-semibold'>
            {sample}
          </span>
        );
      }
      return (
        <span
          key={i}
          className='inline-block rounded bg-[#008069]/15 dark:bg-[#25D366]/20 text-[#008069] dark:text-[#25D366] font-mono text-xs px-1.5 py-0.5 mx-0.5 font-bold border border-[#008069]/20 dark:border-[#25D366]/30'
        >
          {part}
        </span>
      );
    }
    return (
      <span key={i} className='whitespace-pre-wrap break-words leading-relaxed'>
        {part}
      </span>
    );
  });

  const buttons = (buttonsComponent?.buttons || []).map((b) => ({
    type: b.type as 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER',
    text: b.text,
    url: b.url,
    phone_number: b.phone_number,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='bg-transparent p-0 ring-0 shadow-none border-0 max-w-[365px] sm:max-w-[385px] overflow-visible'
      >
        <DialogHeader className='sr-only'>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>
            Category: {template.category}, Status: {template.status}
          </DialogDescription>
        </DialogHeader>

        <div className='relative'>
          <DialogClose
            render={
              <Button
                variant='ghost'
                size='icon-sm'
                className='absolute -top-2 -right-2 z-30 size-7 rounded-full bg-background/85 backdrop-blur-sm border border-border/60 shadow-md hover:bg-background cursor-pointer'
              />
            }
          >
            <Icons.close className='size-3.5' />
            <span className='sr-only'>Close</span>
          </DialogClose>

          <IPhonePreview
            verifiedName={template.name}
            headerType={
              headerComponent &&
              (headerComponent.format === 'TEXT' || !headerComponent.format) &&
              headerComponent.text
                ? 'TEXT'
                : 'NONE'
            }
            headerText={headerComponent?.text || ''}
            bodyContent={bodyContent}
            footerText={footerComponent?.text}
            buttons={buttons}
            showThemeToggle={false}
            screenHeight='h-[480px] sm:h-[540px]'
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
