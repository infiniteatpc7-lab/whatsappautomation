import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import NotificationsPage from '@/features/notifications/components/notifications-page';

export default function NotificationsIndexPage() {
  return (
    <DashboardLayout>
      <NotificationsPage />
    </DashboardLayout>
  );
}
