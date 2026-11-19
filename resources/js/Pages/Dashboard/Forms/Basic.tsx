import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PageContainer from '@/components/layout/page-container';
import DemoForm from '@/components/forms/demo-form';

export default function FormsBasicPage() {
  return (
    <DashboardLayout>
      <PageContainer
        pageTitle='Basic Form'
        pageDescription='A comprehensive form demo with all field types.'
      >
        <DemoForm />
      </PageContainer>
    </DashboardLayout>
  );
}
