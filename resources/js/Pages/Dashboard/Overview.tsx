import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SharedProps } from '@/types';
import { IconBrandWhatsapp, IconArrowRight } from '@tabler/icons-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter
} from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { AreaGraph } from '@/features/overview/components/area-graph';
import { BarGraph } from '@/features/overview/components/bar-graph';
import { PieGraph } from '@/features/overview/components/pie-graph';
import { RecentSales, type RecentCampaignItem } from '@/features/overview/components/recent-sales';

type OverviewPageProps = SharedProps & {
  stats?: {
    outbound_30d: number;
    delivered_30d: number;
    read_30d: number;
    delivery_rate: number;
    total_conversations: number;
    open_windows: number;
    total_contacts: number;
    opted_in_contacts: number;
    sent_today: number;
    daily_limit: number | null;
    tier: string | null;
    quality_rating: string | null;
    health_status: string | null;
  };
  dailyVolume?: Array<{ month: string; desktop: number; mobile: number }>;
  campaignBars?: Array<{ month: string; desktop: number; mobile: number }>;
  recentCampaigns?: RecentCampaignItem[];
  statusPie?: Array<{ browser: string; visitors: number; fill: string }>;
};

export default function Overview() {
  const {
    auth,
    stats = {
      outbound_30d: 0,
      delivered_30d: 0,
      read_30d: 0,
      delivery_rate: 0,
      total_conversations: 0,
      open_windows: 0,
      total_contacts: 0,
      opted_in_contacts: 0,
      sent_today: 0,
      daily_limit: null,
      tier: null,
      quality_rating: null,
      health_status: null,
    },
    dailyVolume = [],
    campaignBars = [],
    recentCampaigns = [],
    statusPie = [],
  } = usePage<OverviewPageProps>().props;

  const isWhatsAppConnected = Boolean(auth.workspace?.has_whatsapp);
  const quotaDisplay = stats.daily_limit !== null
    ? `${stats.sent_today.toLocaleString()} / ${stats.daily_limit.toLocaleString()}`
    : `${stats.sent_today.toLocaleString()}`;

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col gap-4'>
        {!isWhatsAppConnected && (
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#25D366]/5 dark:bg-[#25D366]/10'>
            <div className='flex items-center gap-3'>
              <div className='flex size-9 items-center justify-center rounded-md bg-[#25D366]/20 text-[#25D366] shrink-0'>
                <IconBrandWhatsapp className='size-5' />
              </div>
              <div className='space-y-0.5'>
                <h4 className='text-xs font-semibold text-foreground'>
                  WhatsApp Business API Not Connected
                </h4>
                <p className='text-[11px] text-muted-foreground'>
                  Connect your Meta Cloud API in Workspace settings to unlock WhatsApp chat, AI bot, and campaign delivery.
                </p>
              </div>
            </div>

            <Button
              size='sm'
              render={<Link href='/dashboard/workspace#whatsapp' />}
              className='h-8 px-3 text-xs font-semibold gap-1.5 shrink-0 bg-[#25D366] hover:bg-[#22bf5b] text-white cursor-pointer'
            >
              <span>Connect Account</span>
              <IconArrowRight className='size-3.5' />
            </Button>
          </div>
        )}

        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold tracking-tight'>Hi, Welcome back 👋</h2>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4'>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Messages Sent (30d)</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {stats.outbound_30d.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant='outline'>
                  <Icons.trendingUp />
                  {stats.delivery_rate}% delivered
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className='flex-col items-start gap-1.5 text-sm'>
              <div className='line-clamp-1 flex gap-2 font-medium'>
                Delivered: {stats.delivered_30d.toLocaleString()}
              </div>
              <div className='text-muted-foreground'>
                Seen by {stats.read_30d.toLocaleString()} recipients
              </div>
            </CardFooter>
          </Card>

          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Active Chats</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {stats.total_conversations.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant='outline'>
                  <Icons.chat />
                  {stats.open_windows} open 24h
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className='flex-col items-start gap-1.5 text-sm'>
              <div className='line-clamp-1 flex gap-2 font-medium'>
                {stats.open_windows} active 24h windows
              </div>
              <div className='text-muted-foreground'>Free-form replies enabled</div>
            </CardFooter>
          </Card>

          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Opted-In Contacts</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {stats.opted_in_contacts.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant='outline'>
                  <Icons.teams />
                  {stats.total_contacts.toLocaleString()} total
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className='flex-col items-start gap-1.5 text-sm'>
              <div className='line-clamp-1 flex gap-2 font-medium'>
                Ready for WhatsApp broadcasts
              </div>
              <div className='text-muted-foreground'>Opted-out contacts auto-excluded</div>
            </CardFooter>
          </Card>

          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>24h Meta Quota</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {quotaDisplay}
              </CardTitle>
              <CardAction>
                <Badge variant='outline' className='capitalize'>
                  {stats.quality_rating ? `Quality: ${stats.quality_rating.toLowerCase()}` : 'Not synced'}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className='flex-col items-start gap-1.5 text-sm'>
              <div className='line-clamp-1 flex gap-2 font-medium capitalize'>
                Health: {stats.health_status ? stats.health_status.toLowerCase() : 'Sync in Workspace'}
              </div>
              <div className='text-muted-foreground'>
                {stats.tier ? `Meta Tier: ${stats.tier.replace('TIER_', '')}` : 'Portfolio messaging limit'}
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <div className='col-span-4'>
            <AreaGraph
              data={dailyVolume}
              badgeText={`${stats.outbound_30d} sent (30d)`}
            />
          </div>
          <div className='col-span-4 md:col-span-3'>
            <RecentSales items={recentCampaigns} />
          </div>
          <div className='col-span-4'>
            <BarGraph
              data={campaignBars}
              badgeText={recentCampaigns.length > 0 ? `${recentCampaigns.length} recent` : undefined}
            />
          </div>
          <div className='col-span-4 min-h-0 md:col-span-3'>
            <PieGraph
              data={statusPie}
              badgeText={`${stats.delivery_rate}% delivered`}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
