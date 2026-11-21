import React from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IconLock, IconBrandWhatsapp, IconArrowRight, IconSettings } from '@tabler/icons-react';

interface WhatsAppLockedStateProps {
  featureName: string;
  description?: string;
}

export function WhatsAppLockedState({
  featureName,
  description = 'Connect your Meta WhatsApp Cloud API credentials in Workspace Settings to unlock customer messaging, live chat, and automated flows.'
}: WhatsAppLockedStateProps) {
  return (
    <div className='flex flex-1 items-center justify-center min-h-[460px] p-6'>
      <div className='max-w-md w-full text-center space-y-5 flex flex-col items-center p-8 rounded-xl border border-dashed border-border/80 bg-muted/20 dark:bg-neutral-950/40'>
        <div className='relative'>
          <div className='flex size-14 items-center justify-center rounded-2xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20'>
            <IconBrandWhatsapp className='size-7' />
          </div>
          <div className='absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-background border border-border text-muted-foreground shadow-xs'>
            <IconLock className='size-3.5' />
          </div>
        </div>

        <div className='space-y-2'>
          <div className='flex items-center justify-center gap-2'>
            <h3 className='font-semibold text-lg text-foreground tracking-tight'>
              {featureName} Locked
            </h3>
            <Badge
              variant='outline'
              className='text-xs font-medium rounded-md border-border/80 text-muted-foreground bg-muted/40'
            >
              Setup Required
            </Badge>
          </div>
          <p className='text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto'>
            {description}
          </p>
        </div>

        <div className='pt-2 flex flex-col sm:flex-row items-center gap-3 w-full justify-center'>
          <Button
            render={<Link href='/dashboard/workspace#whatsapp' />}
            className='w-full sm:w-auto h-9 px-4 text-xs font-semibold gap-2 cursor-pointer'
          >
            <IconSettings className='size-3.5' />
            <span>Configure WhatsApp Account</span>
            <IconArrowRight className='size-3.5' />
          </Button>
        </div>
      </div>
    </div>
  );
}
