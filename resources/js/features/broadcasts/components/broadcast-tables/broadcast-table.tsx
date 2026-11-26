'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import type { CampaignItem } from '../../types';
import { createBroadcastColumns, type BroadcastColumnCallbacks } from './columns';

interface BroadcastTableProps extends BroadcastColumnCallbacks {
  data: CampaignItem[];
}

export function BroadcastTable({ data, onPause, onResume, onCancel }: BroadcastTableProps) {
  const columns = useMemo(
    () => createBroadcastColumns({ onPause, onResume, onCancel }),
    [onPause, onResume, onCancel]
  );

  const { table } = useDataTable({
    data,
    columns,
    getRowId: (row) => row.id,
    mode: 'client',
    shallow: true,
    initialState: {
      columnPinning: { start: [], end: ['actions'] },
    },
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
