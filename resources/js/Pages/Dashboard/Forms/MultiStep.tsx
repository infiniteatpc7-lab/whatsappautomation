import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PageContainer from '@/components/layout/page-container';
import FormsShowcasePage from '@/features/forms/components/forms-showcase-page';

export default function FormsMultiStepPage() {
  return (
    <DashboardLayout>
      <PageContainer pageTitle='Multi-Step Form' pageDescription='Multi-step wizard form pattern.'>
        <FormsShowcasePage />
      </PageContainer>
    </DashboardLayout>
  );
}
