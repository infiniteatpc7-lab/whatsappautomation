import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PageContainer from '@/components/layout/page-container';
import AdvancedFormPatterns from '@/features/forms/components/advanced-form-patterns';

export default function FormsAdvancedPage() {
  return (
    <DashboardLayout>
      <PageContainer
        pageTitle='Advanced Form Patterns'
        pageDescription='Linked fields, async validation, dynamic rows, nested objects, cross-field validation, and form-level errors.'
      >
        <AdvancedFormPatterns />
      </PageContainer>
    </DashboardLayout>
  );
}
