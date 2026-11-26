'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import type { WhatsAppTemplate } from '../../types';
import { columns } from './columns';

interface TemplateTableProps {
  data: WhatsAppTemplate[];
}

export function TemplateTable({ data }: TemplateTableProps) {
  const { table } = useDataTable({
    data,
    columns,
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

