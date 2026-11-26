'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/lib/data-table-features';
import { Icons } from '@/components/icons';
import type { ContactItem } from '../../types';
import { CellAction } from './cell-action';

export const OPT_IN_OPTIONS = [
  { label: 'Opted In', value: 'opted_in' },
  { label: 'Opted Out', value: 'opted_out' },
  { label: 'Unknown', value: 'unknown' },
];

export interface ContactColumnCallbacks {
  onEdit: (contact: ContactItem) => void;
  onToggleOptIn: (contact: ContactItem) => void;
  onDelete: (contact: ContactItem) => void;
}

export function createContactColumns(
  callbacks: ContactColumnCallbacks
): ColumnDef<DataTableFeatures, ContactItem>[] {
  return [
    {
      id: 'name',
      accessorFn: (row) => `${row.name || row.profile_name || ''} ${row.wa_id} ${row.email || ''} ${row.company_name || ''}`,
      header: ({ column }) => <DataTableColumnHeader column={column} label='Contact' />,
      cell: ({ row }) => {
        const contact = row.original;
        const displayName = contact.name || contact.profile_name || `+${contact.wa_id}`;
        return (
          <div className='flex flex-col'>
            <span className='font-medium text-foreground text-xs sm:text-sm'>
              {displayName}
            </span>
            {(contact.company_name || contact.email) && (
              <span className='text-[11px] text-muted-foreground truncate max-w-[220px]'>
                {[contact.company_name, contact.email].filter(Boolean).join(' • ')}
              </span>
            )}
          </div>
        );
      },
      meta: {
        label: 'Contact',
        placeholder: 'Search name, phone, email...',
        variant: 'text',
        icon: Icons.text,
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: 'wa_id',
      header: 'WHATSAPP NUMBER',
      cell: ({ cell }) => (
        <span className='font-mono text-xs text-foreground'>
          +{cell.getValue<string>()}
        </span>
      ),
    },
    {
      id: 'tags',
      accessorFn: (row) => row.tags.map((t) => t.name).join(', '),
      header: 'TAGS',
      cell: ({ row }) => {
        const tags = row.original.tags;
        if (!tags || tags.length === 0) {
          return <span className='text-xs text-muted-foreground'>—</span>;
        }
        return (
          <div className='flex flex-wrap gap-1 max-w-[220px]'>
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant='secondary'
                className='border-transparent text-[11px] font-medium'
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'opt_in_status',
      accessorKey: 'opt_in_status',
      header: ({ column }) => <DataTableColumnHeader column={column} label='Opt-In Status' />,
      cell: ({ cell }) => {
        const status = cell.getValue<string>();
        const isOptedIn = status === 'opted_in';
        const isOptedOut = status === 'opted_out';

        return (
          <Badge
            variant='secondary'
            className={
              isOptedIn
                ? 'border-transparent bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                : isOptedOut
                ? 'border-transparent bg-red-500/10 text-red-500 dark:text-red-400'
                : 'border-transparent bg-amber-500/10 text-amber-500 dark:text-amber-400'
            }
          >
            {isOptedIn ? (
              <Icons.circleCheck className='mr-1 size-3' />
            ) : isOptedOut ? (
              <Icons.warning className='mr-1 size-3' />
            ) : (
              <Icons.info className='mr-1 size-3' />
            )}
            {isOptedIn ? 'Opted In' : isOptedOut ? 'Opted Out' : 'Unknown'}
          </Badge>
        );
      },
      enableColumnFilter: true,
      meta: {
        label: 'Opt-In Status',
        variant: 'multiSelect',
        options: OPT_IN_OPTIONS,
      },
    },
    {
      accessorKey: 'source',
      header: 'SOURCE',
      cell: ({ cell }) => (
        <Badge variant='secondary' className='border-transparent text-[11px] capitalize'>
          {(cell.getValue<string>() || 'manual').replace('_', ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'ADDED',
      cell: ({ cell }) => {
        const val = cell.getValue<string | null>();
        if (!val) return <span className='text-muted-foreground text-xs'>—</span>;
        const date = new Date(val);
        return (
          <span className='text-xs text-muted-foreground font-mono'>
            {date.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <CellAction
          data={row.original}
          onEdit={callbacks.onEdit}
          onToggleOptIn={callbacks.onToggleOptIn}
          onDelete={callbacks.onDelete}
        />
      ),
    },
  ];
}
