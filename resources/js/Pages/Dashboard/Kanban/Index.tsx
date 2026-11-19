import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PageContainer from '@/components/layout/page-container';
import { KanbanBoard } from '@/features/kanban/components/kanban-board';
import NewTaskDialog from '@/features/kanban/components/new-task-dialog';

export default function KanbanPage() {
  return (
    <DashboardLayout>
      <PageContainer
        pageTitle='Kanban'
        pageDescription='Manage tasks with drag and drop'
        pageHeaderAction={<NewTaskDialog />}
      >
        <KanbanBoard />
      </PageContainer>
    </DashboardLayout>
  );
}
