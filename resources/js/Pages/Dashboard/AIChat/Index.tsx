import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PageContainer from '@/components/layout/page-container';
import { AiChatDemo } from '@/features/ai-chat/components/ai-chat-demo';

export default function AIChatPage() {
  return (
    <DashboardLayout>
      <PageContainer>
        <AiChatDemo />
      </PageContainer>
    </DashboardLayout>
  );
}
