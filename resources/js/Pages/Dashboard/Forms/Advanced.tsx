import React from 'react';
import PageContainer from '@/components/layout/page-container';
import AdvancedFormPatterns from '@/features/forms/components/advanced-form-patterns';

export default function FormsAdvancedPage() {
  return (
    <PageContainer
      pageTitle='Advanced Form Patterns'
      pageDescription='Linked fields, async validation, dynamic rows, nested objects, cross-field validation, and form-level errors.'
    >
      <AdvancedFormPatterns />
    </PageContainer>
  );
}
