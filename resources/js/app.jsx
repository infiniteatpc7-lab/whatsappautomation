import '../css/app.css';
import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { NuqsAdapter } from 'nuqs/adapters/react';
import ThemeProvider from '@/components/themes/theme-provider';
import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import DashboardLayout from '@/components/layout/dashboard-layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel Shadcn Dashboard';

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true });
    const page = pages[`./Pages/${name}.tsx`];
    if (!page) {
      throw new Error(`Page ${name} not found in ./Pages/`);
    }
    if (page.default && page.default.layout === undefined && name.startsWith('Dashboard/')) {
      page.default.layout = (children) => <DashboardLayout>{children}</DashboardLayout>;
    }
    return page;
  },
  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(
      <NuqsAdapter>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <Providers activeThemeValue='vercel'>
            <Toaster />
            <App {...props} />
          </Providers>
        </ThemeProvider>
      </NuqsAdapter>
    );
  },
  progress: {
    color: 'var(--primary)',
  },
});
