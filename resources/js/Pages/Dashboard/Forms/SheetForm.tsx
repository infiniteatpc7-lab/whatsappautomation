import React from 'react';
import PageContainer from '@/components/layout/page-container';
import SheetFormDemo from '@/features/forms/components/sheet-form-demo';

export default function FormsSheetFormPage() {
  return (
    <PageContainer
      pageTitle='Sheet & Dialog Forms'
      pageDescription='Form patterns inside sheets and dialogs with external submit buttons.'
    >
      <SheetFormDemo />
    </PageContainer>
  );
}
