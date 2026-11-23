'use client';
import React, { useRef, useLayoutEffect } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import { navGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import type { NavItem, SharedProps } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Persistent across page navigations in the SPA
let savedSidebarScrollTop = 0;

export default function AppSidebar() {
  const page = usePage<SharedProps>();
  const pathname = (page?.url || '').split('?')[0];
  const filteredGroups = useFilteredNavGroups(navGroups);
  const contentRef = useRef<HTMLDivElement>(null);

  const auth = page?.props?.auth;
  const user = auth?.user;
  const currentWorkspace = auth?.workspace;
  const workspaces = auth?.workspaces || [];

  // Restore scroll position on mount and whenever pathname changes
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // First try in-memory saved scroll, then sessionStorage
    let targetScroll = savedSidebarScrollTop;
    if (!targetScroll && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('sidebar_scroll_top');
        if (stored) targetScroll = Number(stored);
      } catch { }
    }

    if (targetScroll > 0) {
      el.scrollTop = targetScroll;
    }

    // Ensure the active item is kept in view without jumping
    requestAnimationFrame(() => {
      if (!contentRef.current) return;
      const activeEl = contentRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeEl) {
        const elRect = contentRef.current.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        if (activeRect.top < elRect.top || activeRect.bottom > elRect.bottom) {
          activeEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
          savedSidebarScrollTop = contentRef.current.scrollTop;
        }
      }
    });
  }, [pathname]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    savedSidebarScrollTop = e.currentTarget.scrollTop;
    try {
      sessionStorage.setItem('sidebar_scroll_top', String(e.currentTarget.scrollTop));
    } catch { }
  };

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='p-2 border-b border-sidebar-border/40'>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size='lg'
                    className='w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-popup-open:bg-sidebar-accent'
                  />
                }
              >
                <div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-white font-semibold text-xs border border-neutral-700/60'>
                  {(currentWorkspace?.name || 'W').charAt(0).toUpperCase()}
                </div>
                <div className='flex flex-col text-left text-xs leading-tight min-w-0 flex-1 truncate'>
                  <span className='font-semibold truncate text-sidebar-foreground'>
                    {currentWorkspace?.name || 'Workspace'}
                  </span>
                  <span className='text-[10px] text-muted-foreground truncate capitalize'>
                    {currentWorkspace?.role || 'Owner'} · {currentWorkspace?.plan || 'Starter'} plan
                  </span>
                </div>
                <Icons.chevronsUpDown className='ml-auto size-4 shrink-0 text-muted-foreground' />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--anchor-width) min-w-56 rounded-lg'
                side='bottom'
                align='start'
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className='text-xs font-semibold text-muted-foreground'>
                    Workspaces
                  </DropdownMenuLabel>
                  {workspaces.map((ws) => (
                    <DropdownMenuItem
                      key={ws.uuid}
                      onClick={() => {
                        if (ws.id === currentWorkspace?.id) {
                          router.visit('/dashboard/workspace');
                          return;
                        }
                        router.post(`/dashboard/workspace/switch/${ws.uuid}`, {}, {
                          onSuccess: () => toast.success(`Switched to ${ws.name}`)
                        });
                      }}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer',
                        ws.id === currentWorkspace?.id && 'bg-accent font-medium'
                      )}
                    >
                      <div className='flex size-6 items-center justify-center rounded-md bg-neutral-800 text-white font-semibold text-[10px] mr-1'>
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <span className='truncate flex-1'>{ws.name}</span>
                      {ws.id === currentWorkspace?.id && (
                        <span className='size-1.5 rounded-full bg-primary' />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.visit('/dashboard/workspace')}
                    className='cursor-pointer text-xs'
                  >
                    <Icons.settings className='mr-2 size-3.5' />
                    Workspace Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent
        ref={contentRef}
        onScroll={handleScroll}
        className='overflow-y-auto overflow-x-hidden'
      >
        <LayoutGroup id='sidebar-nav'>
          {filteredGroups.map((group) => (
            <SidebarGroup key={group.label || 'ungrouped'} className='px-0 py-2'>
              {group.label && (
                <SidebarGroupLabel className='h-auto font-medium font-mono text-muted-foreground text-xs uppercase leading-4 tracking-widest px-4 pt-4 pb-1.5'>
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarMenu className='gap-0.5'>
                {group.items.map((item) => (
                  <NavMainItem key={item.title} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </LayoutGroup>
      </SidebarContent>

      <SidebarFooter className='p-2 border-t border-sidebar-border/40 gap-2'>
        {/* User Profile Switcher */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size='lg'
                    className='w-full hover:bg-sidebar-accent data-popup-open:bg-sidebar-accent'
                  />
                }
              >
                <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0284c7] border border-neutral-200 overflow-hidden shadow-2xs'>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className='size-full object-cover' />
                  ) : (
                    <Icons.logo className='size-4.5 text-[#0284c7]' />
                  )}
                </div>
                <div className='flex flex-col text-left text-xs leading-tight min-w-0 flex-1 truncate'>
                  <span className='font-semibold truncate text-sidebar-foreground'>{user?.name || 'User'}</span>
                  <span className='text-[10px] text-muted-foreground truncate'>{user?.email || ''}</span>
                </div>
                <Icons.chevronsUpDown className='ml-auto size-4 shrink-0 text-muted-foreground' />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--anchor-width) min-w-56 rounded-lg'
                side='top'
                align='start'
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className='p-0 font-normal'>
                    <div className='flex items-center gap-2 px-2 py-1.5 text-left text-sm'>
                      <div className='flex size-8 items-center justify-center rounded-full bg-white text-[#0284c7] border border-neutral-200 overflow-hidden shadow-2xs'>
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className='size-full object-cover' />
                        ) : (
                          <Icons.logo className='size-4.5 text-[#0284c7]' />
                        )}
                      </div>
                      <div className='grid flex-1 text-left text-xs leading-tight'>
                        <span className='truncate font-semibold'>{user?.name || 'User'}</span>
                        <span className='truncate text-[10px] text-muted-foreground'>{user?.email || ''}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.visit('/dashboard/account')}>
                    <Icons.user className='mr-2 size-4' />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.visit('/dashboard/workspace')}>
                    <Icons.building className='mr-2 size-4' />
                    Workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.visit('/dashboard/notifications')}>
                    <Icons.notification className='mr-2 size-4' />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.post('/logout')}
                  className='cursor-pointer text-destructive focus:text-destructive'
                >
                  <Icons.logout className='mr-2 size-4' />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function isActivePath(pathname: string, url: string) {
  return pathname === url || (url !== '/' && url !== '#' && pathname.startsWith(`${url}/`));
}

function NavMainItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const { state, isMobile } = useSidebar();
  const Icon = item.icon ? Icons[item.icon] : Icons.logo;
  const children = item.items ?? [];
  const active = isActivePath(pathname, item.url);
  const isPlaceholder = item.url === '#' || !item.url;

  if (children.length === 0) {
    return (
      <SidebarMenuItem data-active={active ? 'true' : undefined}>
        <SidebarMenuButton
          render={
            isPlaceholder ? (
              <button
                type='button'
                onClick={(e) => {
                  e.preventDefault();
                  if (item.badge) {
                    toast.info(`${item.title} (${item.badge}) is coming soon!`);
                  }
                }}
                aria-label={item.title}
              />
            ) : (
              <Link href={item.url} preserveScroll aria-label={item.title} />
            )
          }
          tooltip={item.title}
          isActive={active}
          className={cn(
            'relative h-8 w-full min-w-0 items-center gap-2.5 rounded-none px-4 text-sm font-normal text-muted-foreground transition-colors duration-150',
            'hover:bg-foreground/5 hover:text-foreground',
            'data-active:text-foreground data-active:font-medium',
            'group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:h-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center overflow-hidden'
          )}
        >
          {active && (
            <>
              <motion.div
                layoutId='sidebar-active-pill'
                className='absolute inset-0 bg-foreground/[0.07] z-0'
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
              <motion.div
                layoutId='sidebar-active-bar'
                className='absolute inset-y-0 end-0 w-0.5 bg-foreground z-10'
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            </>
          )}
          <Icon className='size-4 shrink-0 relative z-10' />
          <span className='truncate text-sm relative z-10 group-data-[collapsible=icon]:hidden'>{item.title}</span>
          {item.badge && (
            <span className='ml-auto font-mono text-xs font-normal tracking-wider text-muted-foreground uppercase group-data-[collapsible=icon]:hidden relative z-10'>
              {item.badge}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const hasActiveChild = children.some((child) => isActivePath(pathname, child.url));

  // The icon rail hides sub-items, so a group opens its links in a menu to the right instead
  if (state === 'collapsed' && !isMobile) {
    return (
      <SidebarMenuItem data-active={hasActiveChild ? 'true' : undefined}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                tooltip={item.title}
                isActive={hasActiveChild}
                className={cn(
                  'relative h-8 w-full min-w-0 justify-center rounded-none px-0 text-sm font-normal text-muted-foreground transition-colors duration-150',
                  'hover:bg-foreground/5 hover:text-foreground',
                  'data-active:text-foreground data-active:font-medium',
                  'group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:h-9! group-data-[collapsible=icon]:p-0! overflow-hidden',
                  'data-popup-open:bg-foreground/5 data-popup-open:text-foreground'
                )}
              />
            }
          >
            {hasActiveChild && (
              <>
                <motion.div
                  layoutId='sidebar-active-pill'
                  className='absolute inset-0 bg-foreground/[0.07] z-0'
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
                <motion.div
                  layoutId='sidebar-active-bar'
                  className='absolute inset-y-0 end-0 w-0.5 bg-foreground z-10'
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              </>
            )}
            <Icon className='size-4 shrink-0 relative z-10' />
            <span className='truncate text-sm relative z-10 group-data-[collapsible=icon]:hidden'>{item.title}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side='right'
            align='start'
            sideOffset={8}
            className='w-auto min-w-48'
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {children.map((child) => {
                const ChildIcon = child.icon ? Icons[child.icon] : null;
                const childActive = isActivePath(pathname, child.url);
                const isChildPlaceholder = child.url === '#' || !child.url;
                return (
                  <DropdownMenuItem
                    key={child.title}
                    render={
                      isChildPlaceholder ? (
                        <button
                          type='button'
                          onClick={(e) => {
                            e.preventDefault();
                            if (child.badge) {
                              toast.info(`${child.title} (${child.badge}) is coming soon!`);
                            }
                          }}
                          aria-label={child.title}
                        />
                      ) : (
                        <Link
                          href={child.url}
                          preserveScroll
                          aria-label={child.title}
                          aria-current={childActive ? 'page' : undefined}
                        />
                      )
                    }
                    className={cn(
                      'relative justify-between',
                      childActive ? 'bg-accent text-accent-foreground font-medium' : undefined
                    )}
                  >
                    <div className='flex items-center gap-2'>
                      {ChildIcon && <ChildIcon className='size-4' />}
                      <span>{child.title}</span>
                    </div>
                    {child.badge && (
                      <span className='ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground border border-border leading-none'>
                        {child.badge}
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen={item.isActive || hasActiveChild} render={<SidebarMenuItem data-active={(pathname === item.url || hasActiveChild) ? 'true' : undefined} />}>
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            tooltip={item.title}
            isActive={pathname === item.url || hasActiveChild}
            className={cn(
              'group/collapsible relative h-8 w-full min-w-0 items-center gap-2.5 rounded-none px-4 text-sm font-normal text-muted-foreground transition-colors duration-150',
              'hover:bg-foreground/5 hover:text-foreground',
              'data-active:text-foreground data-active:font-medium',
              'group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:h-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center overflow-hidden'
            )}
          />
        }
      >
        {(pathname === item.url || hasActiveChild) && (
          <>
            <motion.div
              layoutId='sidebar-active-pill'
              className='absolute inset-0 bg-foreground/[0.07] z-0'
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
            <motion.div
              layoutId='sidebar-active-bar'
              className='absolute inset-y-0 end-0 w-0.5 bg-foreground z-10'
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          </>
        )}
        {item.icon && <Icon className='size-4 shrink-0 relative z-10' />}
        <span className='truncate text-sm relative z-10 group-data-[collapsible=icon]:hidden'>{item.title}</span>
        {item.badge && (
          <span className='ml-auto mr-1 font-mono text-[10px] text-muted-foreground/80 tracking-widest uppercase leading-none relative z-10 group-data-[collapsible=icon]:hidden'>
            {item.badge}
          </span>
        )}
        <Icons.chevronRight className='ml-auto transition-transform duration-200 group-data-panel-open/collapsible:rotate-90 relative z-10 group-data-[collapsible=icon]:hidden' />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub className='mx-0 my-0 border-l-0 px-0 pl-6'>
          {children.map((child) => {
            const childActive = isActivePath(pathname, child.url);
            const isChildPlaceholder = child.url === '#' || !child.url;
            return (
              <SidebarMenuSubItem key={child.title} data-active={childActive ? 'true' : undefined}>
                <SidebarMenuSubButton
                  render={
                    isChildPlaceholder ? (
                      <button
                        type='button'
                        onClick={(e) => e.preventDefault()}
                        aria-label={child.title}
                      />
                    ) : (
                      <Link href={child.url} preserveScroll aria-label={child.title} />
                    )
                  }
                  isActive={childActive}
                  className={cn(
                    'relative h-8 w-full min-w-0 rounded-none px-4 text-sm text-muted-foreground transition-colors duration-150',
                    'hover:bg-foreground/5 hover:text-foreground',
                    'data-active:text-foreground data-active:font-medium overflow-hidden'
                  )}
                >
                  {childActive && (
                    <>
                      <motion.div
                        layoutId='sidebar-sub-active-pill'
                        className='absolute inset-0 bg-foreground/[0.07] z-0'
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                      <motion.div
                        layoutId='sidebar-sub-active-bar'
                        className='absolute inset-y-0 end-0 w-0.5 bg-foreground z-10'
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    </>
                  )}
                  <span className='truncate text-sm relative z-10'>{child.title}</span>
                  {child.badge && (
                    <span className='ml-auto font-mono text-[10px] text-muted-foreground/80 tracking-widest uppercase leading-none relative z-10'>
                      {child.badge}
                    </span>
                  )}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}
