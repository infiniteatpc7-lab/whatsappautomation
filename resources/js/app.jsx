import '../css/app.css';
import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import ThemeProvider from '@/components/themes/theme-provider';
import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel Shadcn Dashboard';

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true });
    const page = pages[`./Pages/${name}.tsx`];
    if (!page) {
      throw new Error(`Page ${name} not found in ./Pages/`);
    }
    return page;
  },
  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(
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
    );
  },
  progress: {
    color: 'var(--primary)',
  },
});
