'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import type { ContactItem } from '../../types';
import { createContactColumns, type ContactColumnCallbacks } from './columns';

interface ContactTableProps extends ContactColumnCallbacks {
  data: ContactItem[];
}

export function ContactTable({ data, onEdit, onToggleOptIn, onDelete }: ContactTableProps) {
  const columns = useMemo(
    () => createContactColumns({ onEdit, onToggleOptIn, onDelete }),
    [onEdit, onToggleOptIn, onDelete]
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
