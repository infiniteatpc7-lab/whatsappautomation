import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import PageContainer from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { WhatsAppLockedState } from '@/components/whatsapp-locked-state';
import { BroadcastTable } from '@/features/broadcasts/components/broadcast-tables/broadcast-table';
import type { BroadcastQuota, CampaignItem } from '@/features/broadcasts/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SharedProps } from '@/types';

type BroadcastsPageProps = SharedProps & {
  initialCampaigns?: CampaignItem[];
  hasConnectedAccount?: boolean;
  quota?: BroadcastQuota;
};

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function BroadcastsIndexPage() {
  const {
    initialCampaigns = [],
    hasConnectedAccount,
    quota = { tier: null, daily_limit: null, sent_today: 0, remaining: null },
  } = usePage<BroadcastsPageProps>().props;

  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns);

  useEffect(() => {
    setCampaigns(initialCampaigns);
  }, [initialCampaigns]);

  useEffect(() => {
    if (!hasConnectedAccount) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        router.reload({ only: ['initialCampaigns', 'quota'] });
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hasConnectedAccount]);

  const handleCampaignAction = async (
    campaign: CampaignItem,
    action: 'pause' | 'resume' | 'cancel'
  ) => {
    try {
      const res = await fetch(`/dashboard/broadcasts/${campaign.id}/${action}`, {
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
        toast.error(data.message || `Failed to ${action} broadcast.`);
        return;
      }

      if (data.campaign) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === data.campaign.id ? data.campaign : c))
        );
      }
      toast.success(data.message || `Broadcast ${action}d.`);
    } catch {
      toast.error('Network error while updating broadcast.');
    }
  };

  return (
    <PageContainer
      pageTitle='Broadcast Campaigns'
      pageDescription='Launch, schedule, and track bulk WhatsApp template campaigns within your Meta 24-hour portfolio limit.'
      pageHeaderAction={
        hasConnectedAccount ? (
          <Link
            href='/dashboard/broadcasts/new'
            className={cn(buttonVariants({ size: 'sm' }), 'text-xs md:text-sm font-semibold')}
          >
            <Icons.send className='mr-1.5 h-3.5 w-3.5' />
            New Broadcast
          </Link>
        ) : null
      }
    >
      {hasConnectedAccount ? (
        <div className='flex flex-1 flex-col space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/60 p-3 text-xs text-muted-foreground backdrop-blur-sm'>
            <div className='flex flex-wrap items-center gap-4'>
              <span>
                Campaigns:{' '}
                <span className='font-semibold text-foreground'>{campaigns.length}</span>
              </span>
              <span>
                24h Sent:{' '}
                <span className='font-semibold text-foreground'>{quota.sent_today}</span>
              </span>
              {quota.daily_limit !== null ? (
                <span>
                  Remaining 24h Meta Quota:{' '}
                  <span className='font-semibold text-emerald-500'>
                    {quota.remaining?.toLocaleString()} / {quota.daily_limit.toLocaleString()}
                  </span>
                </span>
              ) : (
                <span>
                  Meta Limit:{' '}
                  <span className='font-semibold text-foreground'>
                    {quota.tier === 'TIER_UNLIMITED' ? 'Unlimited' : 'Sync in Workspace'}
                  </span>
                </span>
              )}
            </div>
            <span className='text-[11px] text-muted-foreground'>
              Opted-out contacts are automatically excluded from all broadcasts.
            </span>
          </div>

          <BroadcastTable
            data={campaigns}
            onPause={(c) => handleCampaignAction(c, 'pause')}
            onResume={(c) => handleCampaignAction(c, 'resume')}
            onCancel={(c) => handleCampaignAction(c, 'cancel')}
          />
        </div>
      ) : (
        <WhatsAppLockedState
          featureName='WhatsApp Broadcasts'
          description='Connect your Meta WhatsApp Cloud API credentials in Workspace settings to start sending template broadcasts.'
        />
      )}
    </PageContainer>
  );
}
