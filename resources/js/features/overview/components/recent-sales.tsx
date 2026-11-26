import { Link } from '@inertiajs/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

export interface RecentCampaignItem {
  id: string;
  name: string;
  subtitle: string;
  fallback: string;
  metric: string;
}

interface RecentSalesProps {
  items?: RecentCampaignItem[];
}

export function RecentSales({ items = [] }: RecentSalesProps) {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Recent Broadcasts</CardTitle>
        <CardDescription>
          {items.length > 0
            ? `Latest ${items.length} WhatsApp campaign deliveries.`
            : 'No broadcast campaigns launched yet.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className='py-8 text-center text-xs text-muted-foreground'>
            Launch a campaign in{' '}
            <Link href='/dashboard/broadcasts/new' className='text-primary underline'>
              Broadcasts
            </Link>{' '}
            to see live delivery stats here.
          </div>
        ) : (
          <div className='space-y-6'>
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/broadcasts/${item.id}`}
                className='flex items-center hover:opacity-80 transition-opacity'
              >
                <Avatar className='h-9 w-9'>
                  <AvatarImage src='' alt={item.name} />
                  <AvatarFallback>{item.fallback}</AvatarFallback>
                </Avatar>
                <div className='ml-4 space-y-1 min-w-0'>
                  <p className='text-sm leading-none font-medium truncate'>{item.name}</p>
                  <p className='text-muted-foreground text-xs truncate'>{item.subtitle}</p>
                </div>
                <div className='ml-auto font-mono text-sm font-medium pl-2'>{item.metric}</div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
