import React, { useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { WhatsAppLockedState } from '@/components/whatsapp-locked-state';
import { TemplateTable } from '@/features/templates/components/template-tables/template-table';
import type { WhatsAppTemplate } from '@/features/templates/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { SharedProps } from '@/types';

type TemplatesPageProps = SharedProps & {
  initialTemplates?: WhatsAppTemplate[];
  hasConnectedAccount?: boolean;
  activeAccount?: {
    id: number;
    waba_id: string;
    phone_number_id: string;
    display_phone_number: string | null;
    verified_name: string | null;
  } | null;
};

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function TemplatesPage() {
  const { initialTemplates = [], hasConnectedAccount, activeAccount } =
    usePage<TemplatesPageProps>().props;

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(initialTemplates);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/dashboard/templates/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || 'Failed to sync templates from Meta.');
        return;
      }

      toast.success(data.message || 'Templates synced successfully.');
      if (Array.isArray(data.templates)) {
        setTemplates(data.templates);
      }
    } catch {
      toast.error('Network error while connecting to Meta Graph API.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <PageContainer
      pageTitle='WhatsApp Templates'
      pageDescription='View, inspect, and sync approved Meta message templates for broadcasts and 24-hour service window re-engagement.'
      pageHeaderAction={
        hasConnectedAccount ? (
          <div className='flex items-center gap-2'>
            <Link
              href='/dashboard/templates/new'
              className={cn(buttonVariants({ size: 'sm' }), 'text-xs md:text-sm font-semibold')}
            >
              <Icons.add className='mr-1.5 h-3.5 w-3.5' />
              Create Template
            </Link>
            <Button
              variant='outline'
              onClick={handleSync}
              disabled={isSyncing}
              size='sm'
              className='text-xs md:text-sm'
            >
              <Icons.refresh
                className={cn('mr-1.5 h-3.5 w-3.5', isSyncing && 'animate-spin')}
              />
              {isSyncing ? 'Syncing...' : 'Sync from Meta'}
            </Button>
            <a
              href='https://business.facebook.com/wa/manage/message-templates/'
              target='_blank'
              rel='noopener noreferrer'
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs md:text-sm')}
            >
              <Icons.externalLink className='mr-1.5 h-3.5 w-3.5' />
              Meta Manager
            </a>
          </div>
        ) : null
      }
    >
      {hasConnectedAccount ? (
        <div className='flex flex-1 flex-col space-y-4'>
          {activeAccount && (
            <div className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/60 p-3 text-xs text-muted-foreground backdrop-blur-sm'>
              <div className='flex items-center gap-2'>
                <Icons.badgeCheck className='size-4 text-emerald-500' />
                <span>
                  Connected WABA:{' '}
                  <span className='font-mono font-medium text-foreground'>
                    {activeAccount.waba_id}
                  </span>
                </span>
                {activeAccount.verified_name && (
                  <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground'>
                    {activeAccount.verified_name}
                  </span>
                )}
              </div>
              <div>
                <span>Total synced templates: </span>
                <span className='font-semibold text-foreground font-mono'>
                  {templates.length}
                </span>
              </div>
            </div>
          )}
          <TemplateTable data={templates} />
        </div>
      ) : (
        <WhatsAppLockedState
          featureName='WhatsApp Message Templates'
          description='Connect your Meta WhatsApp Cloud API credentials in Workspace settings to sync and manage approved message templates.'
        />
      )}
    </PageContainer>
  );
}
