import React from 'react';
import PageContainer from '@/components/layout/page-container';
import ProductViewPage from '@/features/products/components/product-view-page';

export default function ProductShowPage({ productId = 'new' }: { productId?: string }) {
  return (
    <PageContainer>
      <div className='flex-1 space-y-4'>
        <ProductViewPage productId={productId} />
      </div>
    </PageContainer>
  );
}
