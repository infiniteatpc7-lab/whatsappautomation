import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PageContainer from '@/components/layout/page-container';
import SheetFormDemo from '@/features/forms/components/sheet-form-demo';

export default function FormsSheetFormPage() {
  return (
    <DashboardLayout>
      <PageContainer
        pageTitle='Sheet & Dialog Forms'
        pageDescription='Form patterns inside sheets and dialogs with external submit buttons.'
      >
        <SheetFormDemo />
      </PageContainer>
    </DashboardLayout>
  );
}
