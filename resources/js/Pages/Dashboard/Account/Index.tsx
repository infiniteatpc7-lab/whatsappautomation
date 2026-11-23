import React, { useState } from 'react';
import { CrosshairContainer, CrosshairRow } from '@/components/ui/crosshair-grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  IconUser,
  IconKey,
  IconTrash,
  IconCopy,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconArrowUpRight,
  IconInfinity,
  IconShieldLock,
  IconShieldCheck,
  IconDevices,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconLogout
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Link, router, usePage } from '@inertiajs/react';
import { SharedProps } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

interface DeviceSession {
  id: string;
  device_number: number;
  device_name: string;
  browser: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | string;
  ip_address: string;
  is_current_device: boolean;
  last_active_at: string;
  last_active_timestamp: number;
}

interface AccountIndexProps {
  user?: {
    id: number;
    name: string;
    email: string;
    phone: string;
    two_factor_enabled: boolean;
    created_at: string;
  };
  devices?: DeviceSession[];
}

export default function AccountIndex({ user: initialUser, devices = [] }: AccountIndexProps) {
  const { auth } = usePage<SharedProps>().props;
  const currentUser = initialUser ?? auth.user;

  const [name, setName] = useState(currentUser?.name ?? 'Admin User');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    initialUser?.two_factor_enabled ?? auth.user?.two_factor_enabled ?? false
  );
  const [isToggling2FA, setIsToggling2FA] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);
  const [token, setToken] = useState('shd_live_9f82d1c7a4e6b5289f0123456789abcdef');
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleRevokeDevice = (sessionId: string) => {
    setRevokingDeviceId(sessionId);
    router.delete(`/dashboard/account/devices/${sessionId}`, {
      preserveScroll: true,
      onSuccess: () => {
        setRevokingDeviceId(null);
        toast.success('Device session logged out successfully.');
      },
      onError: (errs) => {
        setRevokingDeviceId(null);
        const firstErr = Object.values(errs)[0];
        if (firstErr) toast.error(firstErr);
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success('Registry token copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const newToken = `shd_live_${randomHex}`;
    setToken(newToken);
    toast.success('Registry token regenerated successfully');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    router.patch(
      '/dashboard/account/profile',
      { name, phone },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSaving(false);
          toast.success('Profile changes saved successfully');
        },
        onError: (errs) => {
          setIsSaving(false);
          const firstErr = Object.values(errs)[0];
          if (firstErr) toast.error(firstErr);
        }
      }
    );
  };

  const handleToggle2FA = (checked: boolean) => {
    setIsToggling2FA(true);
    router.patch(
      '/dashboard/account/two-factor',
      { enabled: checked },
      {
        preserveScroll: true,
        onSuccess: () => {
          setTwoFactorEnabled(checked);
          setIsToggling2FA(false);
          toast.success(
            checked
              ? 'Two-factor authentication enabled successfully.'
              : 'Two-factor authentication disabled.'
          );
        },
        onError: (errs) => {
          setIsToggling2FA(false);
          const firstErr = Object.values(errs)[0];
          if (firstErr) toast.error(firstErr);
        }
      }
    );
  };

  const handleDeleteData = () => {
    toast.error('Data deletion requested. In production this triggers account cleanup.');
  };

  return (
    <div className='flex-1 w-full bg-background min-h-full py-8 md:py-12'>
        <CrosshairContainer>
          {/* Header Row */}
          <CrosshairRow hasTopCrosshair className='pb-8'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
              <div className='space-y-2'>
                <span className='lined-label font-medium font-mono text-muted-foreground text-xs uppercase leading-4 tracking-widest'>
                  Free Plan
                </span>
                <div className='flex items-center gap-3'>
                  <div className='flex size-8 items-center justify-center rounded-full bg-white border border-neutral-200 text-[#0284c7] shadow-2xs'>
                    <IconInfinity className='size-5 text-[#0284c7]' />
                  </div>
                  <h1 className='lined-title text-balance font-semibold text-3xl tracking-tighter md:text-4xl text-foreground'>
                    Your account
                  </h1>
                </div>
                <p className='text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed'>
                  How you appear, your registry token for the{' '}
                  <span className='font-mono text-foreground/90'>// shadcn</span> CLI and your
                  agent, and the account itself.
                </p>
              </div>

              <div className='shrink-0'>
                <Button
                  render={<Link href='/dashboard/workspace' />}
                  variant='outline'
                  size='sm'
                  className='h-8 px-4 text-xs font-medium border-border/80 hover:bg-accent'
                >
                  Your workspace
                </Button>
              </div>
            </div>
          </CrosshairRow>

          {/* Section 1: Profile */}
          <CrosshairRow>
            <div className='flex flex-col md:flex-row gap-8 md:gap-12'>
              {/* Left Column Descriptor */}
              <div className='w-full md:w-80 shrink-0 space-y-3'>
                <div className='flex size-9 items-center justify-center rounded-md border border-border/80 bg-muted/50 dark:bg-neutral-900/60 text-foreground'>
                  <IconUser className='size-4.5' />
                </div>
                <h2 className='mt-1 text-balance font-semibold text-xl tracking-tight text-foreground'>
                  Profile
                </h2>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  How you appear in your workspace. Your avatar comes from your sign-in provider:
                  change it there. Your email is how you sign in:{' '}
                  <a
                    href='#contact'
                    className='underline underline-offset-2 text-foreground/90 hover:text-foreground'
                  >
                    contact support
                  </a>{' '}
                  to change it.
                </p>
              </div>

              {/* Right Column Form & Identity */}
              <div className='flex-1 min-w-0 space-y-6'>
                {/* User Identity Card */}
                <div className='flex items-center gap-4'>
                  <div className='flex size-16 items-center justify-center rounded-full bg-white border border-neutral-200 text-[#0284c7] shadow-xs'>
                    <IconInfinity className='size-8 text-[#0284c7]' />
                  </div>
                  <div className='flex flex-col min-w-0'>
                    <span className='font-semibold text-sm text-foreground truncate'>
                      {currentUser?.name ?? 'User Account'}
                    </span>
                    <span className='text-xs text-muted-foreground truncate'>
                      {currentUser?.email ?? 'user@example.com'}
                    </span>
                    <span className='text-[11px] text-muted-foreground/60 mt-0.5'>
                      Member since {initialUser?.created_at ? new Date(initialUser.created_at).getFullYear() : '2026'}
                    </span>
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSave} className='space-y-6'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='account-name' className='text-xs text-muted-foreground font-medium'>
                        Name
                      </Label>
                      <Input
                        id='account-name'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className='h-9 bg-muted/40 dark:bg-neutral-950/60 border-input dark:border-border/80 text-foreground text-sm font-normal focus:border-foreground/50'
                      />
                      <p className='text-[11px] text-muted-foreground/70'>
                        Real name or pseudonym: what others see.
                      </p>
                    </div>

                    <div className='space-y-1.5'>
                      <Label htmlFor='account-phone' className='text-xs text-muted-foreground font-medium'>
                        Phone
                      </Label>
                      <Input
                        id='account-phone'
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder='Optional'
                        className='h-9 bg-muted/40 dark:bg-neutral-950/60 border-input dark:border-border/80 text-foreground text-sm font-normal focus:border-foreground/50'
                      />
                      <p className='text-[11px] text-muted-foreground/70'>
                        Stays private, never shown.
                      </p>
                    </div>
                  </div>

                  <div className='flex justify-end pt-2'>
                    <Button
                      type='submit'
                      disabled={isSaving}
                      size='sm'
                      className='h-8 px-4 text-xs font-semibold cursor-pointer'
                    >
                      {isSaving ? 'Saving...' : 'Save changes'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </CrosshairRow>

          {/* Section: Two-Factor Authentication (2FA) */}
          <CrosshairRow>
            <div className='flex flex-col md:flex-row gap-8 md:gap-12'>
              {/* Left Column Descriptor */}
              <div className='w-full md:w-80 shrink-0 space-y-3'>
                <div className='flex size-9 items-center justify-center rounded-md border border-border/80 bg-muted/50 dark:bg-neutral-900/60 text-foreground'>
                  <IconShieldLock className='size-4.5' />
                </div>
                <div className='flex items-center gap-2'>
                  <h2 className='mt-1 text-balance font-semibold text-xl tracking-tight text-foreground'>
                    Two-Factor Auth
                  </h2>
                  <Badge
                    variant='secondary'
                    className={cn(
                      'text-xs px-3 py-1 rounded-md font-medium border-0',
                      twoFactorEnabled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted/40 text-muted-foreground'
                    )}
                  >
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  Add an extra layer of security. When enabled, signing into your account will require a
                  fresh 6-digit verification code sent to your registered email address.
                </p>
              </div>

              {/* Right Column Toggle Control */}
              <div className='flex-1 min-w-0 space-y-5'>
                <div className='rounded-lg border border-border/70 p-4 space-y-3 bg-muted/20 dark:bg-neutral-950/40'>
                  <div className='flex items-center justify-between gap-4'>
                    <div className='space-y-0.5'>
                      <Label htmlFor='two-factor-switch' className='text-xs font-medium text-foreground cursor-pointer'>
                        Email Verification Code (2FA)
                      </Label>
                      <p className='text-[11px] text-muted-foreground leading-relaxed'>
                        Receive a one-time 6-digit code via email every time you log in from any browser.
                      </p>
                    </div>

                    <Switch
                      id='two-factor-switch'
                      checked={twoFactorEnabled}
                      onCheckedChange={handleToggle2FA}
                      disabled={isToggling2FA}
                      aria-label='Toggle Two-Factor Authentication'
                    />
                  </div>

                  <div className='pt-2 border-t border-border/40 flex items-center gap-2 text-[11px] text-muted-foreground'>
                    <IconShieldCheck className='size-3.5 text-primary shrink-0' />
                    <span>
                      {twoFactorEnabled
                        ? '2FA is active. Every login requires OTP verification.'
                        : '2FA is disabled. Login requires only your email and password.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CrosshairRow>

          {/* Section: Logged-in Devices */}
          <CrosshairRow>
            <div className='flex flex-col md:flex-row gap-8 md:gap-12'>
              {/* Left Column Descriptor */}
              <div className='w-full md:w-80 shrink-0 space-y-3'>
                <div className='flex size-9 items-center justify-center rounded-md border border-border/80 bg-muted/50 dark:bg-neutral-900/60 text-foreground'>
                  <IconDevices className='size-4.5' />
                </div>
                <div className='flex items-center gap-2'>
                  <h2 className='mt-1 text-balance font-semibold text-xl tracking-tight text-foreground'>
                    Active Devices
                  </h2>
                  <Badge
                    variant='secondary'
                    className='text-xs px-3 py-1 rounded-md font-medium border-0 bg-muted/40 text-muted-foreground'
                  >
                    {devices.length} {devices.length === 1 ? 'Device' : 'Devices'}
                  </Badge>
                </div>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  Manage browsers and physical devices signed into your account. Each device is
                  assigned a unique device number independent of changing network IPs.
                </p>
              </div>

              {/* Right Column Device List */}
              <div className='flex-1 min-w-0 space-y-3'>
                <div className='rounded-lg border border-border/70 divide-y divide-border/60 bg-muted/20 dark:bg-neutral-950/40 overflow-hidden'>
                  {devices.length === 0 ? (
                    <div className='p-4 text-center text-xs text-muted-foreground'>
                      No other devices detected. You are logged in from this browser.
                    </div>
                  ) : (
                    devices.map((device) => {
                      const DeviceIcon =
                        device.device_type === 'mobile'
                          ? IconDeviceMobile
                          : device.device_type === 'tablet'
                            ? IconDeviceTablet
                            : IconDeviceLaptop;

                      return (
                        <div
                          key={device.id}
                          className='p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3'
                        >
                          <div className='flex items-start gap-3.5'>
                            <div className='mt-0.5 flex size-9 items-center justify-center rounded-md border border-border/70 bg-background text-foreground shrink-0'>
                              <DeviceIcon className='size-5 text-primary' />
                            </div>

                            <div className='space-y-1 min-w-0'>
                              <div className='flex items-center gap-2 flex-wrap'>
                                <span className='font-semibold text-xs text-foreground'>
                                  Device #{device.device_number}: {device.device_name}
                                </span>
                                <span className='text-xs text-muted-foreground font-normal'>
                                  ({device.browser})
                                </span>
                                {device.is_current_device && (
                                  <Badge
                                    variant='secondary'
                                    className='inline-flex items-center gap-1.5 px-3 py-1 border-0 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  >
                                    <span className='size-1.5 rounded-full bg-emerald-500 shrink-0' />
                                    <span>This Device</span>
                                  </Badge>
                                )}
                              </div>

                              <div className='flex items-center gap-3 text-[11px] text-muted-foreground/80 flex-wrap'>
                                <span>
                                  IP:{' '}
                                  <span className='font-mono text-foreground/80'>
                                    {device.ip_address}
                                  </span>
                                </span>
                                <span>•</span>
                                <span>{device.last_active_at}</span>
                              </div>
                            </div>
                          </div>

                          {!device.is_current_device && (
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              disabled={revokingDeviceId === device.id}
                              onClick={() => handleRevokeDevice(device.id)}
                              className='h-7 px-3 text-[11px] font-medium border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 shrink-0 self-start sm:self-auto cursor-pointer'
                            >
                              {revokingDeviceId === device.id ? 'Revoking...' : 'Log out device'}
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </CrosshairRow>

        {/* Section 2: Registry token */}
        <CrosshairRow>
          <div className='flex flex-col md:flex-row gap-8 md:gap-12'>
            {/* Left Column Descriptor */}
            <div className='w-full md:w-80 shrink-0 space-y-3'>
              <div className='flex size-9 items-center justify-center rounded-md border border-border/80 bg-muted/50 dark:bg-neutral-900/60 text-foreground'>
                <IconKey className='size-4.5' />
              </div>
              <h2 className='mt-1 text-balance font-semibold text-xl tracking-tight text-foreground'>
                Registry token
              </h2>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Used by the shadcn CLI and inside your{' '}
                <a
                  href='#mcp'
                  className='underline underline-offset-2 text-foreground/90 hover:text-foreground'
                >
                  MCP URL
                </a>
                . Treat it like a password: anyone with it can install Pro components as you.
              </p>
            </div>

            {/* Right Column Token Control */}
            <div className='flex-1 min-w-0 space-y-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='registry-token' className='text-xs text-muted-foreground font-medium'>
                  Your token
                </Label>
                <div className='relative flex items-center'>
                  <Input
                    id='registry-token'
                    readOnly
                    value={showToken ? token : '••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                    className='h-9 font-mono text-xs pr-20 bg-muted/40 dark:bg-neutral-950/60 border-input dark:border-border/80 text-foreground select-all'
                  />
                  <div className='absolute right-1.5 flex items-center gap-1'>
                    <button
                      type='button'
                      onClick={() => setShowToken(!showToken)}
                      className='p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-neutral-800 transition-colors'
                      title={showToken ? 'Hide token' : 'Show token'}
                    >
                      {showToken ? <IconEyeOff className='size-4' /> : <IconEye className='size-4' />}
                    </button>
                    <button
                      type='button'
                      onClick={handleCopy}
                      className='p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-neutral-800 transition-colors'
                      title='Copy token'
                    >
                      {copied ? (
                        <IconCheck className='size-4 text-emerald-400' />
                      ) : (
                        <IconCopy className='size-4' />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1'>
                <span className='text-xs text-muted-foreground/80'>
                  Leaked, or shared by mistake? Regenerate it.
                </span>
                <Button
                  type='button'
                  onClick={handleRegenerate}
                  variant='outline'
                  size='sm'
                  className='h-8 px-3 text-xs font-medium border-border/80 hover:bg-accent gap-1.5 self-start sm:self-auto'
                >
                  <IconRefresh className='size-3.5' />
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        </CrosshairRow>

        {/* Section 3: Destructive Data Zone */}
        <CrosshairRow>
          <div className='flex flex-col md:flex-row gap-8 md:gap-12'>
            {/* Left Column Descriptor */}
            <div className='w-full md:w-80 shrink-0 space-y-3'>
              <div className='flex size-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400'>
                <IconTrash className='size-4.5' />
              </div>
              <h2 className='mt-1 text-balance font-semibold text-xl tracking-tight text-red-500'>
                Delete your shadcn.io data
              </h2>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Permanently removes what shadcn.io keeps for you. Your account stays. There's no
                undo.
              </p>
            </div>

            {/* Right Column Breakdown & Destructive CTA */}
            <div className='flex-1 min-w-0 space-y-5'>
              <div className='space-y-2'>
                <h3 className='text-xs font-semibold text-foreground/90 tracking-tight'>
                  What goes with it
                </h3>
                <ul className='space-y-1.5 text-xs text-muted-foreground list-disc list-inside pl-1 marker:text-muted-foreground/60'>
                  <li>Your registry token: the CLI and your MCP URL stop working.</li>
                  <li>Your place in every workspace you're in.</li>
                  <li>Your shadcn.io profile, and your sign-in here: you're signed out.</li>
                </ul>
              </div>

              <div className='space-y-2 pt-1'>
                <h3 className='text-xs font-semibold text-foreground/90 tracking-tight'>
                  What stays
                </h3>
                <ul className='space-y-1.5 text-xs text-muted-foreground list-disc list-inside pl-1 marker:text-muted-foreground/60'>
                  <li>Your account: its email and sign-in methods, for kit.dev and our other products.</li>
                  <li>
                    To delete the account itself, go to{' '}
                    <a
                      href='https://kit.dev'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='underline underline-offset-2 text-foreground/90 hover:text-foreground inline-flex items-center gap-0.5'
                    >
                      kit.dev/settings/account
                      <IconArrowUpRight className='size-3 text-muted-foreground' />
                    </a>
                    .
                  </li>
                </ul>
              </div>

            <div className='flex justify-end pt-3'>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='inline-flex items-center gap-1.5 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 dark:bg-destructive/20 dark:border-destructive/30 dark:text-destructive dark:hover:bg-destructive/30 text-xs font-medium px-4 h-8 transition-colors cursor-pointer'
                    />
                  }
                >
                  <IconTrash className='size-3.5' />
                  Delete my data
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will immediately invalidate your registry token and revoke your access
                      across all workspaces. This action cannot be reversed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteData}
                      className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    >
                      Confirm & Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
      </div>
    </CrosshairRow>
      </CrosshairContainer >
    </div >
  );
}
