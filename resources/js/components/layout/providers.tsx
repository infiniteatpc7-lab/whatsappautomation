'use client';
import React from 'react';
import { ActiveThemeProvider } from '@/components/themes/active-theme';
import { ThemeCustomizerProvider } from '@/components/themes/theme-customizer-context';
import QueryProvider from '@/components/layout/query-provider';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <ThemeCustomizerProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeCustomizerProvider>
      </ActiveThemeProvider>
    </>
  );
}
