import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PageContainer from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { ProductTable } from '@/features/products/components/product-tables';
import { productInfoContent } from '@/config/infoconfig';
import { Icons } from '@/components/icons';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export default function ProductIndexPage() {
  return (
    <DashboardLayout>
      <PageContainer
        pageTitle='Products'
        pageDescription='Manage products (React Query + nuqs table pattern.)'
        infoContent={productInfoContent}
        pageHeaderAction={
          <Link href='/dashboard/product/new' className={cn(buttonVariants(), 'text-xs md:text-sm')}>
            <Icons.add className='mr-2 h-4 w-4' /> Add New
          </Link>
        }
      >
        <ProductTable />
      </PageContainer>
    </DashboardLayout>
  );
}
