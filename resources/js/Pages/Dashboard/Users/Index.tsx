import React from 'react';
import PageContainer from '@/components/layout/page-container';
import { UsersTable } from '@/features/users/components/users-table';
import { UserFormSheetTrigger } from '@/features/users/components/user-form-sheet';
import { usersInfoContent } from '@/features/users/info-content';

export default function UsersPage() {
  return (
    <PageContainer
      pageTitle='Users'
      pageDescription='Manage users (React Query + nuqs table pattern.)'
      infoContent={usersInfoContent}
      pageHeaderAction={<UserFormSheetTrigger />}
    >
      <UsersTable />
    </PageContainer>
  );
}
