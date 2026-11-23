import React, { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { PokemonInfo } from '@/features/react-query-demo/components/pokemon-info';
import { PokemonSkeleton } from '@/features/react-query-demo/components/pokemon-skeleton';
import { reactQueryInfoContent } from '@/features/react-query-demo/info-content';

export default function ReactQueryDemoPage() {
  return (
    <PageContainer
      pageTitle='React Query'
      pageDescription='Server prefetch + client hydration + suspense query pattern.'
      infoContent={reactQueryInfoContent}
    >
      <Suspense fallback={<PokemonSkeleton />}>
        <PokemonInfo />
      </Suspense>
    </PageContainer>
  );
}
