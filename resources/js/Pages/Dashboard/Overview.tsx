import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import DashboardLayout from '@/components/layout/dashboard-layout';
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
import { RecentSales } from '@/features/overview/components/recent-sales';

export default function Overview() {
  const { auth } = usePage<SharedProps>().props;
  const isWhatsAppConnected = Boolean(auth.workspace?.has_whatsapp);

  return (
    <DashboardLayout>
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
                <CardDescription>Total Revenue</CardDescription>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                  $1,250.00
                </CardTitle>
                <CardAction>
                  <Badge variant='outline'>
                    <Icons.trendingUp />
                    +12.5%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className='flex-col items-start gap-1.5 text-sm'>
                <div className='line-clamp-1 flex gap-2 font-medium'>
                  Trending up this month <Icons.trendingUp className='size-4' />
                </div>
                <div className='text-muted-foreground'>Visitors for the last 6 months</div>
              </CardFooter>
            </Card>
            <Card className='@container/card'>
              <CardHeader>
                <CardDescription>New Customers</CardDescription>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                  1,234
                </CardTitle>
                <CardAction>
                  <Badge variant='outline'>
                    <Icons.trendingDown />
                    -20%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className='flex-col items-start gap-1.5 text-sm'>
                <div className='line-clamp-1 flex gap-2 font-medium'>
                  Down 20% this period <Icons.trendingDown className='size-4' />
                </div>
                <div className='text-muted-foreground'>Acquisition needs attention</div>
              </CardFooter>
            </Card>
            <Card className='@container/card'>
              <CardHeader>
                <CardDescription>Active Accounts</CardDescription>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                  45,678
                </CardTitle>
                <CardAction>
                  <Badge variant='outline'>
                    <Icons.trendingUp />
                    +12.5%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className='flex-col items-start gap-1.5 text-sm'>
                <div className='line-clamp-1 flex gap-2 font-medium'>
                  Strong user retention <Icons.trendingUp className='size-4' />
                </div>
                <div className='text-muted-foreground'>Engagement exceed targets</div>
              </CardFooter>
            </Card>
            <Card className='@container/card'>
              <CardHeader>
                <CardDescription>Growth Rate</CardDescription>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                  4.5%
                </CardTitle>
                <CardAction>
                  <Badge variant='outline'>
                    <Icons.trendingUp />
                    +4.5%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className='flex-col items-start gap-1.5 text-sm'>
                <div className='line-clamp-1 flex gap-2 font-medium'>
                  Steady performance increase <Icons.trendingUp className='size-4' />
                </div>
                <div className='text-muted-foreground'>Meets growth projections</div>
              </CardFooter>
            </Card>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
            <div className='col-span-4'>
              <AreaGraph />
            </div>
            <div className='col-span-4 md:col-span-3'>
              <RecentSales />
            </div>
            <div className='col-span-4'>
              <BarGraph />
            </div>
            <div className='col-span-4 min-h-0 md:col-span-3'>
              <PieGraph />
            </div>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
