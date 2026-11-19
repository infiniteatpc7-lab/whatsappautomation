import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Messenger } from '@/features/chat/components/messenger';

export default function ChatPage() {
  return (
    <DashboardLayout>
      <div className='flex min-h-0 flex-1 p-4 md:p-6'>
        <Messenger />
      </div>
    </DashboardLayout>
  );
}
