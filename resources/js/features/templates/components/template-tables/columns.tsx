'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import type { WhatsAppTemplate } from '../../types';
import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/lib/data-table-features';
import { Icons } from '@/components/icons';
import { CellAction } from './cell-action';

export const CATEGORY_OPTIONS = [
  { label: 'Marketing', value: 'MARKETING' },
  { label: 'Utility', value: 'UTILITY' },
  { label: 'Authentication', value: 'AUTHENTICATION' },
];

export const STATUS_OPTIONS = [
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Paused', value: 'PAUSED' },
];

export const columns: ColumnDef<DataTableFeatures, WhatsAppTemplate>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} label='Template Name' />,
    cell: ({ row }) => {
      const template = row.original;
      return (
        <div className='flex flex-col'>
          <span className='font-mono font-medium text-foreground text-xs sm:text-sm'>
            {template.name}
          </span>
          {template.meta_template_id && (
            <span className='font-mono text-[10px] text-muted-foreground'>
              ID: {template.meta_template_id}
            </span>
          )}
        </div>
      );
    },
    meta: {
      label: 'Name',
      placeholder: 'Search template by name...',
      variant: 'text',
      icon: Icons.text,
    },
    enableColumnFilter: true,
  },
  {
    id: 'category',
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} label='Category' />,
    cell: ({ cell }) => {
      const category = cell.getValue<string>();
      return (
        <Badge variant='outline' className='capitalize font-medium text-xs'>
          {category ? category.toLowerCase() : 'Utility'}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: 'Category',
      variant: 'multiSelect',
      options: CATEGORY_OPTIONS,
    },
  },
  {
    accessorKey: 'language',
    header: 'LANGUAGE',
    cell: ({ cell }) => (
      <Badge variant='secondary' className='font-mono text-[11px] uppercase'>
        {cell.getValue<string>()}
      </Badge>
    ),
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} label='Status' />,
    cell: ({ cell }) => {
      const status = cell.getValue<string>();
      const isApproved = status === 'APPROVED';
      const isRejected = status === 'REJECTED';
      const isPending = status === 'PENDING';

      return (
        <Badge
          variant='secondary'
          className={
            isApproved
              ? 'border-transparent bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 capitalize'
              : isRejected
              ? 'border-transparent bg-red-500/10 text-red-500 dark:text-red-400 capitalize'
              : isPending
              ? 'border-transparent bg-amber-500/10 text-amber-500 dark:text-amber-400 capitalize'
              : 'border-transparent capitalize'
          }
        >
          {isApproved ? (
            <Icons.circleCheck className='mr-1 size-3' />
          ) : isRejected ? (
            <Icons.warning className='mr-1 size-3' />
          ) : (
            <Icons.spinner className='mr-1 size-3 animate-spin' />
          )}
          {status ? status.toLowerCase() : 'Unknown'}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: 'Status',
      variant: 'multiSelect',
      options: STATUS_OPTIONS,
    },
  },
  {
    accessorKey: 'body_text',
    header: 'BODY PREVIEW',
    cell: ({ cell }) => {
      const body = cell.getValue<string>();
      return (
        <div className='max-w-xs sm:max-w-sm truncate text-xs text-muted-foreground'>
          {body || '—'}
        </div>
      );
    },
  },
  {
    accessorKey: 'last_synced_at',
    header: 'LAST SYNCED',
    cell: ({ cell }) => {
      const val = cell.getValue<string>();
      if (!val) return <span className='text-muted-foreground text-xs'>—</span>;
      const date = new Date(val);
      return (
        <span className='text-xs text-muted-foreground font-mono'>
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
