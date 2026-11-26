import React, { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { IconDownload } from '@tabler/icons-react';
import { toast } from 'sonner';
import { IPhonePreview } from '@/features/templates/components/iphone-preview';
import type { TemplateComponent } from '@/features/templates/types';
import type { CampaignItem, CampaignRecipientItem } from '@/features/broadcasts/types';
import { cn } from '@/lib/utils';
import { SharedProps } from '@/types';

type BroadcastShowProps = SharedProps & {
  campaign: CampaignItem;
  template: {
    name: string;
    body_text: string;
    components: TemplateComponent[];
  };
  recipients: CampaignRecipientItem[];
};

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function CircularStat({
  label,
  count,
  total,
  variant = 'success',
}: {
  label: string;
  count: number;
  total: number;
  variant?: 'success' | 'danger';
}) {
  const pct = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className='flex flex-col items-center text-center py-2'>
      <div className='relative size-20 flex items-center justify-center'>
        <svg className='size-20 -rotate-90' viewBox='0 0 80 80'>
          <circle
            cx='40'
            cy='40'
            r={radius}
            fill='none'
            strokeWidth='5'
            className='stroke-muted'
          />
          <circle
            cx='40'
            cy='40'
            r={radius}
            fill='none'
            strokeWidth='5'
            strokeLinecap='round'
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              'transition-all duration-500',
              variant === 'danger' ? 'stroke-red-500' : 'stroke-emerald-500'
            )}
          />
        </svg>
        <span
          className={cn(
            'absolute text-sm font-semibold font-mono',
            variant === 'danger' ? 'text-red-500' : 'text-foreground'
          )}
        >
          {pct}%
        </span>
      </div>
      <span className='mt-2 text-xs font-semibold text-foreground'>{label}</span>
      <span className='text-[11px] text-muted-foreground font-mono'>
        {count.toLocaleString()} of {total.toLocaleString()}
      </span>
    </div>
  );
}

export default function BroadcastShowPage() {
  const { campaign, template, recipients = [] } = usePage<BroadcastShowProps>().props;
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

  const failedRecipients = recipients.filter((r) => r.status === 'failed');

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        router.reload({
          only: ['campaign', 'recipients'],
          onSuccess: () => setLastUpdated(new Date()),
        });
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/dashboard/broadcasts/${campaign.id}/retry-failed`, {
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
        toast.error(data.message || 'Failed to retry recipients.');
        return;
      }
      toast.success(data.message || 'Failed recipients re-queued.');
      router.reload({ only: ['campaign', 'recipients'] });
    } catch {
      toast.error('Network error while retrying.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleExportFailedCsv = () => {
    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = [
      'phone,name,error_code,error_message',
      ...failedRecipients.map((r) =>
        [
          escape(`+${r.wa_id}`),
          escape(r.contact_name),
          escape(r.error_code ?? ''),
          escape(r.error_message ?? ''),
        ].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `failed-recipients-${campaign.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const headerComp = template?.components?.find((c) => c.type === 'HEADER');
  const footerComp = template?.components?.find((c) => c.type === 'FOOTER');
  const buttonsComp = template?.components?.find((c) => c.type === 'BUTTONS');
  const previewButtons = (buttonsComp?.buttons ?? [])
    .filter((b) => b.type === 'QUICK_REPLY' || b.type === 'URL' || b.type === 'PHONE_NUMBER')
    .map((b) => ({
      type: b.type as 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER',
      text: b.text,
      url: b.url,
      phone_number: b.phone_number,
    }));

  const bodyText = template?.body_text ?? '';
  const bodyContent = bodyText.split(/(\{\{\d+\}\})/g).map((part, i) => {
    if (/^\{\{\d+\}\}$/.test(part)) {
      return (
        <span
          key={i}
          className='inline-block rounded bg-[#008069]/15 dark:bg-[#25D366]/20 text-[#008069] dark:text-[#25D366] font-mono text-xs px-1.5 py-0.5 mx-0.5 font-bold'
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

  return (
    <PageContainer
      pageTitle={campaign.name}
      pageDescription={`Template: ${campaign.template_name} (${campaign.template_language}) • Status: ${campaign.status.toUpperCase()} • Last updated: ${lastUpdated.toLocaleTimeString()}`}
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          {failedRecipients.length > 0 && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportFailedCsv}
              className='text-xs md:text-sm'
            >
              <IconDownload className='mr-1.5 size-3.5' />
              Export Failed CSV
            </Button>
          )}
          {campaign.failed_count > 0 && campaign.status !== 'processing' && (
            <Button
              size='sm'
              onClick={handleRetryFailed}
              disabled={isRetrying}
              className='text-xs md:text-sm'
            >
              <Icons.refresh className={cn('mr-1.5 size-3.5', isRetrying && 'animate-spin')} />
              {isRetrying ? 'Retrying...' : 'Retry Failed'}
            </Button>
          )}
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              router.reload({
                only: ['campaign', 'recipients'],
                onSuccess: () => setLastUpdated(new Date()),
              })
            }
            className='text-xs md:text-sm'
          >
            <Icons.refresh className='mr-1.5 size-3.5' />
            Refresh
          </Button>
          <Link
            href='/dashboard/broadcasts'
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs md:text-sm')}
          >
            <Icons.chevronLeft className='mr-1.5 size-3.5' />
            Back
          </Link>
        </div>
      }
    >
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
        {/* Left Column: Funnel Progress + Recipient Log */}
        <div className='lg:col-span-8 space-y-6'>
          <Card>
            <CardContent className='p-4 sm:p-5'>
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4'>
                <CircularStat
                  label='Sent'
                  count={campaign.sent_count}
                  total={campaign.total_recipients}
                />
                <CircularStat
                  label='Delivered'
                  count={campaign.delivered_count}
                  total={campaign.sent_count}
                />
                <CircularStat
                  label='Seen'
                  count={campaign.read_count}
                  total={campaign.delivered_count}
                />
                <CircularStat
                  label='Responded'
                  count={campaign.replied_count ?? 0}
                  total={campaign.delivered_count}
                />
                <CircularStat
                  label='Clicks'
                  count={0}
                  total={campaign.delivered_count}
                />
                <CircularStat
                  label='Failed'
                  count={campaign.failed_count}
                  total={campaign.total_recipients}
                  variant='danger'
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='p-4 pb-2'>
              <CardTitle className='text-sm font-semibold'>
                Recipient Delivery Log ({recipients.length})
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <table className='w-full text-left text-xs'>
                  <thead className='border-b border-border/60 bg-muted/30 text-muted-foreground'>
                    <tr>
                      <th className='px-4 py-2.5 font-medium'>Contact</th>
                      <th className='px-4 py-2.5 font-medium'>WhatsApp</th>
                      <th className='px-4 py-2.5 font-medium'>Status</th>
                      <th className='px-4 py-2.5 font-medium'>Error / Details</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border/40'>
                    {recipients.map((r) => (
                      <tr key={r.id} className='hover:bg-muted/20'>
                        <td className='px-4 py-2.5 font-medium text-foreground'>
                          {r.contact_name}
                        </td>
                        <td className='px-4 py-2.5 font-mono text-muted-foreground'>
                          +{r.wa_id}
                        </td>
                        <td className='px-4 py-2.5'>
                          <Badge
                            variant='secondary'
                            className={cn(
                              'border-transparent capitalize',
                              r.status === 'delivered' && 'bg-emerald-500/10 text-emerald-500',
                              r.status === 'read' && 'bg-sky-500/10 text-sky-500',
                              r.status === 'failed' && 'bg-red-500/10 text-red-500'
                            )}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className='px-4 py-2.5 text-muted-foreground'>
                          {r.error_message ? (
                            <span className='text-red-500'>
                              {r.error_code ? `[${r.error_code}] ` : ''}
                              {r.error_message}
                            </span>
                          ) : r.read_at ? (
                            `Seen ${new Date(r.read_at).toLocaleTimeString()}`
                          ) : r.delivered_at ? (
                            `Delivered ${new Date(r.delivered_at).toLocaleTimeString()}`
                          ) : r.sent_at ? (
                            `Sent ${new Date(r.sent_at).toLocaleTimeString()}`
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Template Phone Mockup Preview */}
        <div className='lg:col-span-4'>
          <div className='sticky top-6'>
            <IPhonePreview
              verifiedName={template?.name || campaign.template_name}
              headerType={
                headerComp &&
                (headerComp.format === 'TEXT' || !headerComp.format) &&
                headerComp.text
                  ? 'TEXT'
                  : 'NONE'
              }
              headerText={headerComp?.text || ''}
              bodyContent={bodyContent}
              footerText={footerComp?.text}
              buttons={previewButtons}
              showThemeToggle={false}
              screenHeight='h-[580px] xl:h-[620px]'
              className='max-w-[315px] xl:max-w-[335px]'
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
