'use client';

import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/lib/data-table-features';
import { Icons } from '@/components/icons';
import type { CampaignItem } from '../../types';
import { CellAction } from './cell-action';

export const CAMPAIGN_STATUS_OPTIONS = [
  { label: 'Completed', value: 'completed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Paused', value: 'paused' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Failed', value: 'failed' },
];

export interface BroadcastColumnCallbacks {
  onPause: (campaign: CampaignItem) => void;
  onResume: (campaign: CampaignItem) => void;
  onCancel: (campaign: CampaignItem) => void;
}

function formatCampaignDateBadge(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const mon = months[date.getMonth()];
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  const absSec = Math.abs(diffSec);
  let relative = 'just now';
  if (absSec >= 60 && absSec < 3600) {
    const m = Math.floor(absSec / 60);
    relative = diffSec >= 0 ? `${m}m ago` : `in ${m}m`;
  } else if (absSec >= 3600 && absSec < 86400) {
    const h = Math.floor(absSec / 3600);
    relative = diffSec >= 0 ? `${h}h ago` : `in ${h}h`;
  } else if (absSec >= 86400) {
    const d = Math.floor(absSec / 86400);
    relative = diffSec >= 0 ? `${d} ${d === 1 ? 'day' : 'days'} ago` : `in ${d} ${d === 1 ? 'day' : 'days'}`;
  }

  return `${day}-${mon}-${year} ${hh}:${mm} (${relative})`;
}

export function createBroadcastColumns(
  callbacks: BroadcastColumnCallbacks
): ColumnDef<DataTableFeatures, CampaignItem>[] {
  return [
    {
      id: 'name',
      accessorFn: (row) => `${row.name} ${row.template_name}`,
      header: ({ column }) => <DataTableColumnHeader column={column} label='Campaign' />,
      cell: ({ row }) => {
        const campaign = row.original;
        return (
          <div className='flex flex-col'>
            <Link
              href={`/dashboard/broadcasts/${campaign.id}`}
              className='font-medium text-foreground hover:underline text-xs sm:text-sm'
            >
              {campaign.name}
            </Link>
            <span className='font-mono text-[11px] text-muted-foreground'>
              Template: {campaign.template_name} ({campaign.template_language})
            </span>
          </div>
        );
      },
      meta: {
        label: 'Campaign',
        placeholder: 'Search campaign or template...',
        variant: 'text',
        icon: Icons.text,
      },
      enableColumnFilter: true,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} label='Status' />,
      cell: ({ row }) => {
        const campaign = row.original;
        const status = campaign.status;
        const isCompleted = status === 'completed';
        const isProcessing = status === 'processing';
        const isScheduled = status === 'scheduled';
        const isPaused = status === 'paused';
        const isFailed = status === 'failed' || status === 'cancelled';

        const dateLabel = isCompleted
          ? formatCampaignDateBadge(campaign.completed_at || campaign.started_at || campaign.created_at)
          : isScheduled
          ? formatCampaignDateBadge(campaign.scheduled_at)
          : '';

        const statusText = isCompleted
          ? dateLabel
            ? `Sent ${dateLabel}`
            : 'Sent'
          : isScheduled
          ? dateLabel
            ? `Scheduled ${dateLabel}`
            : 'Scheduled'
          : status;

        return (
          <Badge
            variant='secondary'
            className={
              isCompleted
                ? 'border-transparent bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 whitespace-nowrap'
                : isProcessing || isScheduled
                ? 'border-transparent bg-sky-500/10 text-sky-500 dark:text-sky-400 whitespace-nowrap'
                : isPaused
                ? 'border-transparent bg-amber-500/10 text-amber-500 dark:text-amber-400 capitalize whitespace-nowrap'
                : isFailed
                ? 'border-transparent bg-red-500/10 text-red-500 dark:text-red-400 capitalize whitespace-nowrap'
                : 'border-transparent capitalize whitespace-nowrap'
            }
          >
            {isCompleted ? (
              <Icons.circleCheck className='mr-1.5 size-3.5 shrink-0' />
            ) : isProcessing ? (
              <Icons.spinner className='mr-1.5 size-3.5 shrink-0 animate-spin' />
            ) : isFailed ? (
              <Icons.warning className='mr-1.5 size-3.5 shrink-0' />
            ) : (
              <Icons.info className='mr-1.5 size-3.5 shrink-0' />
            )}
            <span>{statusText}</span>
          </Badge>
        );
      },
      enableColumnFilter: true,
      meta: {
        label: 'Status',
        variant: 'multiSelect',
        options: CAMPAIGN_STATUS_OPTIONS,
      },
    },
    {
      accessorKey: 'total_recipients',
      header: 'RECIPIENTS',
      cell: ({ row }) => (
        <span className='font-mono text-xs text-foreground'>
          {row.original.total_recipients.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'funnel',
      header: 'DELIVERY FUNNEL',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono whitespace-nowrap'>
            <span className='text-foreground'>
              Sent: <span className='font-semibold'>{c.sent_count}</span>
            </span>
            <span className='text-emerald-500'>
              Delivered: <span className='font-semibold'>{c.delivered_count}</span>
            </span>
            <span className='text-sky-500'>
              Seen: <span className='font-semibold'>{c.read_count}</span>
            </span>
            <span className={c.failed_count > 0 ? 'text-red-500' : 'text-muted-foreground'}>
              Failed: <span className='font-semibold'>{c.failed_count}</span>
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'creator_name',
      header: 'CREATED BY',
      cell: ({ row }) => (
        <span className='text-xs text-foreground whitespace-nowrap'>
          {row.original.creator_name || 'System'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <CellAction
          data={row.original}
          onPause={callbacks.onPause}
          onResume={callbacks.onResume}
          onCancel={callbacks.onCancel}
        />
      ),
    },
  ];
}
