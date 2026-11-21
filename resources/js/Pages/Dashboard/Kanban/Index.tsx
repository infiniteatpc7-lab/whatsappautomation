import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PageContainer from '@/components/layout/page-container';
import { KanbanBoard } from '@/features/kanban/components/kanban-board';
import NewTaskDialog from '@/features/kanban/components/new-task-dialog';
import { WhatsAppLockedState } from '@/components/whatsapp-locked-state';
import { usePage } from '@inertiajs/react';
import { SharedProps } from '@/types';

export default function KanbanPage() {
  const { auth } = usePage<SharedProps>().props;
  const isWhatsAppConnected = Boolean(auth.workspace?.has_whatsapp);

  return (
    <DashboardLayout>
      <PageContainer
        pageTitle='Kanban'
        pageDescription='Manage tasks and customer lead pipelines with drag and drop'
        pageHeaderAction={isWhatsAppConnected ? <NewTaskDialog /> : undefined}
      >
        {isWhatsAppConnected ? (
          <KanbanBoard />
        ) : (
          <WhatsAppLockedState
            featureName='WhatsApp Lead Pipeline'
            description='Track WhatsApp customer leads across your deal stages. Connect your WhatsApp Business API account to sync conversations into pipeline cards.'
          />
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
