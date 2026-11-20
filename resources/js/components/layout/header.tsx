import { Separator } from '../ui/separator';
import { Breadcrumbs } from '../breadcrumbs';
import SearchInput from '../search-input';
import { ThemeModeToggle } from '../themes/theme-mode-toggle';
import { ThemeCustomizerTrigger, ThemeCustomizerPanel } from '../themes/theme-customizer';
import { SidebarToggle } from './sidebar-toggle';
import { NotificationCenter } from '@/features/notifications/components/notification-center';

export default function Header() {
  return (
    <div className='flex flex-col shrink-0 w-full'>
      <header className='flex h-14 shrink-0 items-center gap-3 border-b px-3 md:px-4'>
        <div className='flex min-w-0 flex-1 items-center'>
          <SidebarToggle />
          <Separator
            orientation='vertical'
            className='mr-3 ml-1.5 data-vertical:h-4 data-vertical:self-center'
          />
          <Breadcrumbs />
        </div>

        <div className='flex shrink-0 items-center gap-1'>
          <SearchInput />
          <ThemeCustomizerTrigger />
          <ThemeModeToggle />
          <NotificationCenter />
        </div>
      </header>
      <ThemeCustomizerPanel />
    </div>
  );
}
