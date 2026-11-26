import React, { useState, useEffect } from 'react';
import { CrosshairContainer, CrosshairRow } from '@/components/ui/crosshair-grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
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
import {
  IconBuilding,
  IconBrandWhatsapp,
  IconUsers,
  IconUserPlus,
  IconCheck,
  IconCopy,
  IconRefresh,
  IconTrash,
  IconEdit,
  IconArrowRight,
  IconDotsVertical,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconShieldCheck
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Link, router, usePage } from '@inertiajs/react';
import { SharedProps } from '@/types';

interface WorkspaceData {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  timezone: string;
  plan: string;
}

interface WorkspaceMember {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: string;
  is_available: boolean;
  is_you: boolean;
  is_owner: boolean;
}

interface PendingInvitation {
  id: number;
  email: string;
  role: string;
  expires_at?: string | null;
  created_at?: string | null;
}

interface WhatsAppAccountData {
  id: number;
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string;
  phone_number?: string;
  status: string;
  verified_name?: string | null;
  quality_rating?: string | null;
  health_status?: string | null;
  tier?: string | null;
  sent_today_contacts?: number;
  webhook_verify_token?: string | null;
  has_webhook_verify_token?: boolean;
  webhook_url: string;
  last_synced_at?: string | null;
  has_access_token: boolean;
  has_app_secret: boolean;
}

interface WorkspacePageProps {
  workspace: WorkspaceData;
  members: WorkspaceMember[];
  pendingInvitations: PendingInvitation[];
  whatsappAccount: WhatsAppAccountData | null;
}

export default function Workspace({
  workspace: initialWorkspace,
  members: initialMembers = [],
  pendingInvitations: initialPendingInvitations = [],
  whatsappAccount: initialWhatsAppAccount = null
}: WorkspacePageProps) {
  const { auth } = usePage<SharedProps>().props;
  const isOwnerOrAdmin =
    auth.workspace?.role === 'owner' ||
    auth.workspace?.role === 'admin' ||
    auth.workspace?.role === 'manager';

  // Workspace settings state
  const [workspaceName, setWorkspaceName] = useState(initialWorkspace?.name ?? '');
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);

  // Invite teammate state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'agent' | 'manager' | 'admin'>('agent');
  const [isInviting, setIsInviting] = useState(false);

  // WhatsApp Connect Form State (New Setup)
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState(() =>
    Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  );
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false);

  // WhatsApp Edit Modal State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDisplayPhone, setEditDisplayPhone] = useState(
    initialWhatsAppAccount?.display_phone_number ?? ''
  );
  const [editAccessToken, setEditAccessToken] = useState('');
  const [editAppSecret, setEditAppSecret] = useState('');
  const [isUpdatingWhatsApp, setIsUpdatingWhatsApp] = useState(false);

  // WhatsApp Testing / Action states
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Scroll to hash on load (e.g. #whatsapp from locked state)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#whatsapp') {
      const el = document.getElementById('whatsapp');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, []);

  // Update edit form values if account updates
  useEffect(() => {
    if (initialWhatsAppAccount) {
      setEditDisplayPhone(initialWhatsAppAccount.display_phone_number || '');
    }
  }, [initialWhatsAppAccount]);

  // Handle Workspace Update
  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      toast.error('Workspace name cannot be empty.');
      return;
    }

    setIsSavingWorkspace(true);
    router.patch(
      `/dashboard/workspace/${initialWorkspace.uuid}`,
      { name: workspaceName.trim() },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSavingWorkspace(false);
          toast.success('Workspace name updated successfully.');
        },
        onError: (errs) => {
          setIsSavingWorkspace(false);
          const firstErr = Object.values(errs)[0];
          if (firstErr) toast.error(firstErr);
        }
      }
    );
  };

  // Handle Teammate Invite
  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsInviting(true);
    router.post(
      '/dashboard/workspace/members',
      {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsInviting(false);
          setInviteEmail('');
          toast.success(`Invitation sent to ${inviteEmail}.`);
        },
        onError: (errs) => {
          setIsInviting(false);
          const firstErr = Object.values(errs)[0];
          if (firstErr) toast.error(firstErr);
        }
      }
    );
  };

  // Handle Member Role Change
  const handleChangeRole = (memberId: number, newRole: string) => {
    router.patch(
      `/dashboard/workspace/members/${memberId}`,
      { role: newRole },
      {
        preserveScroll: true,
        onSuccess: () => toast.success(`Member role updated to ${newRole}.`),
        onError: (errs) => {
          const firstErr = Object.values(errs)[0];
          if (firstErr) toast.error(firstErr);
        }
      }
    );
  };

  // Handle Member Removal
  const handleRemoveMember = (memberId: number, memberName: string) => {
    router.delete(`/dashboard/workspace/members/${memberId}`, {
      preserveScroll: true,
      onSuccess: () => toast.success(`Removed ${memberName} from workspace.`),
      onError: (errs) => {
        const firstErr = Object.values(errs)[0];
        if (firstErr) toast.error(firstErr);
      }
    });
  };

  // Handle Cancel Invitation
  const handleCancelInvitation = (inviteId: number) => {
    router.delete(`/dashboard/workspace/invitations/${inviteId}`, {
      preserveScroll: true,
      onSuccess: () => toast.success('Invitation cancelled.'),
      onError: (errs) => {
        const firstErr = Object.values(errs)[0];
        if (firstErr) toast.error(firstErr);
      }
    });
  };

  // Handle WhatsApp Account Connection (Store)
  const handleConnectWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wabaId.trim() || !phoneNumberId.trim() || !displayPhoneNumber.trim() || !accessToken.trim()) {
      toast.error('Please complete all required WhatsApp API fields.');
      return;
    }

    setIsConnectingWhatsApp(true);
    router.post(
      '/dashboard/whatsapp-accounts',
      {
        waba_id: wabaId.trim(),
        phone_number_id: phoneNumberId.trim(),
        display_phone_number: displayPhoneNumber.trim(),
        access_token: accessToken.trim(),
        app_secret: appSecret.trim() || null,
        webhook_verify_token: webhookVerifyToken.trim() || null
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsConnectingWhatsApp(false);
          toast.success('WhatsApp account configured! Click "Test Connection" to verify with Meta.');
        },
        onError: (errs) => {
          setIsConnectingWhatsApp(false);
          const firstErr = Object.values(errs)[0];
          if (firstErr) toast.error(firstErr);
        }
      }
    );
  };

  // Handle WhatsApp Connection Test
  const handleTestConnection = () => {
    if (!initialWhatsAppAccount) return;
    setIsTestingWhatsApp(true);
    router.post(
      `/dashboard/whatsapp-accounts/${initialWhatsAppAccount.id}/test`,
      {},
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setIsTestingWhatsApp(false);
          const flash = (page.props as any).flash;
          if (flash?.error) {
            toast.error(flash.error);
          } else {
            toast.success('WhatsApp connection verified and synced with Meta Cloud API!');
          }
        },
        onError: (errs) => {
          setIsTestingWhatsApp(false);
          const firstErr = Object.values(errs)[0];
          if (firstErr) toast.error(firstErr);
        }
      }
    );
  };

  // Handle WhatsApp Account Edit
  const handleUpdateWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialWhatsAppAccount) return;

    setIsUpdatingWhatsApp(true);
    const payload: Record<string, string | null> = {
      display_phone_number: editDisplayPhone.trim()
    };
    if (editAccessToken.trim()) {
      payload.access_token = editAccessToken.trim();
    }
    if (editAppSecret.trim()) {
      payload.app_secret = editAppSecret.trim();
    }

    router.patch(`/dashboard/whatsapp-accounts/${initialWhatsAppAccount.id}`, payload, {
      preserveScroll: true,
      onSuccess: () => {
        setIsUpdatingWhatsApp(false);
        setIsEditDialogOpen(false);
        setEditAccessToken('');
        setEditAppSecret('');
        toast.success('WhatsApp credentials updated successfully.');
      },
      onError: (errs) => {
        setIsUpdatingWhatsApp(false);
        const firstErr = Object.values(errs)[0];
        if (firstErr) toast.error(firstErr);
      }
    });
  };

  // Handle WhatsApp Account Disconnect
  const handleDisconnectWhatsApp = () => {
    if (!initialWhatsAppAccount) return;
    setIsDisconnecting(true);
    router.delete(`/dashboard/whatsapp-accounts/${initialWhatsAppAccount.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        setIsDisconnecting(false);
        setWabaId('');
        setPhoneNumberId('');
        setDisplayPhoneNumber('');
        setAccessToken('');
        setAppSecret('');
        setWebhookVerifyToken(
          Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        );
        toast.success('WhatsApp account disconnected and removed.');
      },
      onError: (errs) => {
        setIsDisconnecting(false);
        const firstErr = Object.values(errs)[0];
        if (firstErr) toast.error(firstErr);
      }
    });
  };

  // Copy helper
  const copyToClipboard = (text: string, type: 'url' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
    toast.success('Copied to clipboard');
  };

  return (
    <div className='flex-1 w-full bg-background min-h-full py-8 md:py-12'>
        <CrosshairContainer>
          {/* Header Row */}
          <CrosshairRow hasTopCrosshair className='pb-8'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <Badge
                    variant='outline'
                    className='text-xs font-medium px-2.5 py-0.5 rounded-md border-border/80 text-muted-foreground bg-muted/30 capitalize'
                  >
                    {initialWorkspace?.plan ?? 'Starter'} Plan
                  </Badge>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-2xs'>
                    <IconBuilding className='size-5' />
                  </div>
                  <h1 className='lined-title text-balance font-semibold text-3xl tracking-tighter md:text-4xl text-foreground'>
                    Workspace settings
                  </h1>
                </div>
                <p className='text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed'>
                  Configure workspace name, manage team access, and connect your Meta WhatsApp
                  Business Cloud API credentials.
                </p>
              </div>

              <div className='shrink-0'>
                <Button
                  render={<Link href='/dashboard/account' />}
                  variant='outline'
                  size='sm'
                  className='h-8 px-4 text-xs font-medium border-border/80 hover:bg-accent gap-1.5'
                >
                  <span>Your account</span>
                  <IconArrowRight className='size-3.5' />
                </Button>
              </div>
            </div>
          </CrosshairRow>

          {/* Section 1: General Info */}
          <CrosshairRow>
            <div className='flex flex-col md:flex-row gap-8 md:gap-12'>
              <div className='w-full md:w-80 shrink-0 space-y-3'>
                <div className='flex size-9 items-center justify-center rounded-md border border-border/80 bg-muted/50 dark:bg-neutral-900/60 text-foreground'>
                  <IconBuilding className='size-4.5' />
                </div>
                <h2 className='mt-1 text-balance font-semibold text-xl tracking-tight text-foreground'>
                  General
                </h2>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  How teammates see this workspace and its unique URL slug.
                </p>
              </div>

              <div className='flex-1 min-w-0 space-y-6'>
                <div className='flex items-center gap-3.5 pb-4 border-b border-border/80'>
                  <div className='size-12 rounded-lg bg-primary/10 text-primary font-bold text-lg flex items-center justify-center uppercase ring-1 ring-primary/20'>
                    {workspaceName.charAt(0) || 'W'}
                  </div>
                  <div className='space-y-0.5'>
                    <div className='font-semibold text-sm leading-none text-foreground'>
                      {workspaceName}
                    </div>
                    <div className='text-xs text-muted-foreground font-mono'>
                      /{initialWorkspace?.slug}
                    </div>
                    <div className='text-[11px] text-muted-foreground/75'>
                      {initialMembers.length} {initialMembers.length === 1 ? 'member' : 'members'} ·{' '}
                      {initialWorkspace?.timezone || 'UTC'}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveWorkspace} className='space-y-4 max-w-xl'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='workspace-name' className='text-xs font-medium'>
                      Workspace Name
                    </Label>
                    <Input
                      id='workspace-name'
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder='Workspace name'
                      className='h-9 text-xs'
                      disabled={!isOwnerOrAdmin}
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label htmlFor='workspace-slug' className='text-xs font-medium'>
                      Workspace Slug
                    </Label>
                    <div className='flex items-center rounded-md border border-input bg-muted/30 text-xs font-mono px-3 h-9 text-muted-foreground'>
                      <span>app.domain/w/</span>
                      <span className='text-foreground font-medium pl-0.5'>
                        {initialWorkspace?.slug}
                      </span>
                    </div>
                  </div>

                  {isOwnerOrAdmin && (
                    <Button
                      type='submit'
                      size='sm'
                      disabled={isSavingWorkspace}
                      className='h-8 px-3 text-xs font-medium gap-1.5'
                    >
                      {isSavingWorkspace && <IconRefresh className='size-3.5 animate-spin' />}
                      Save changes
                    </Button>
                  )}
                </form>
              </div>
            </div>
          </CrosshairRow>

          {/* Section 2: WhatsApp Cloud API Configuration */}
          <CrosshairRow id='whatsapp'>
            <div className='flex flex-col md:flex-row gap-8 md:gap-12'>
              <div className='w-full md:w-80 shrink-0 space-y-3'>
                <div className='flex size-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500'>
                  <IconBrandWhatsapp className='size-5' />
                </div>
                <h2 className='mt-1 text-balance font-semibold text-xl tracking-tight text-foreground'>
                  WhatsApp Cloud API
                </h2>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  Direct Meta Graph API integration. Connect your business phone number to unlock
                  customer live chat, automated broadcasts, AI chat agents, and lead pipeline tracking.
                </p>
              </div>

              <div className='flex-1 min-w-0 space-y-6'>
                {initialWhatsAppAccount ? (
                  /* Connected State */
                  <div className='space-y-6'>
                    <Card className='border-border/80'>
                      <CardContent className='p-6 space-y-6'>
                        {/* Status Bar */}
                        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/80'>
                          <div className='flex items-center gap-3 min-w-0'>
                            <div className='flex items-center justify-center text-emerald-500 shrink-0'>
                              <IconBrandWhatsapp className='size-6' />
                            </div>
                            <div className='min-w-0'>
                              <div className='flex items-center gap-2 flex-wrap'>
                                <span className='font-semibold text-sm text-foreground whitespace-nowrap'>
                                  {initialWhatsAppAccount.display_phone_number}
                                </span>
                                {initialWhatsAppAccount.verified_name && (
                                  <Badge
                                    variant='outline'
                                    className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 whitespace-nowrap'
                                  >
                                    <IconShieldCheck className='size-3.5 text-emerald-500 shrink-0' />
                                    <span>{initialWhatsAppAccount.verified_name}</span>
                                  </Badge>
                                )}
                              </div>
                              <p className='text-xs text-muted-foreground mt-0.5 truncate'>
                                Phone Number ID: <span className='font-mono text-foreground/80'>{initialWhatsAppAccount.phone_number_id}</span>
                              </p>
                            </div>
                          </div>

                          <div className='flex items-center gap-2 flex-wrap lg:justify-end shrink-0'>
                            {initialWhatsAppAccount.status === 'connected' && (
                              <Badge
                                variant='secondary'
                                className='inline-flex items-center gap-1.5 px-3 py-1 border-0 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              >
                                <span className='size-1.5 rounded-full bg-emerald-500 shrink-0' />
                                <span>Connected</span>
                              </Badge>
                            )}
                            {initialWhatsAppAccount.status === 'pending' && (
                              <Badge
                                variant='secondary'
                                className='inline-flex items-center gap-1.5 px-3 py-1 border-0 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              >
                                <span className='size-1.5 rounded-full bg-amber-500 shrink-0' />
                                <span>Pending verification</span>
                              </Badge>
                            )}
                            {initialWhatsAppAccount.status === 'error' && (
                              <Badge
                                variant='secondary'
                                className='inline-flex items-center gap-1.5 px-3 py-1 border-0 rounded-md text-xs font-medium bg-destructive/10 text-destructive'
                              >
                                <span className='size-1.5 rounded-full bg-destructive shrink-0' />
                                <span>Connection error</span>
                              </Badge>
                            )}

                            {initialWhatsAppAccount.quality_rating && (
                              <Badge
                                variant='secondary'
                                className='inline-flex items-center px-3 py-1 border-0 rounded-md text-xs font-medium bg-muted/40 text-muted-foreground capitalize whitespace-nowrap'
                              >
                                Quality: <span className='text-foreground ml-1'>{initialWhatsAppAccount.quality_rating.toLowerCase()}</span>
                              </Badge>
                            )}
                            {initialWhatsAppAccount.health_status && (
                              <Badge
                                variant='secondary'
                                className='inline-flex items-center px-3 py-1 border-0 rounded-md text-xs font-medium bg-muted/40 text-muted-foreground capitalize whitespace-nowrap'
                              >
                                Health:{' '}
                                <span
                                  className={
                                    initialWhatsAppAccount.health_status === 'AVAILABLE'
                                      ? 'text-emerald-500 ml-1'
                                      : initialWhatsAppAccount.health_status === 'LIMITED'
                                      ? 'text-amber-500 ml-1'
                                      : 'text-red-500 ml-1'
                                  }
                                >
                                  {initialWhatsAppAccount.health_status.toLowerCase()}
                                </span>
                              </Badge>
                            )}
                            {initialWhatsAppAccount.tier ? (
                              <Badge
                                variant='secondary'
                                className='inline-flex items-center px-3 py-1 border-0 rounded-md text-xs font-medium bg-muted/40 text-muted-foreground whitespace-nowrap'
                              >
                                Limit:{' '}
                                <span className='text-foreground ml-1'>
                                  {initialWhatsAppAccount.sent_today_contacts ?? 0} /{' '}
                                  {({
                                    TIER_50: '50',
                                    TIER_250: '250',
                                    TIER_1K: '1,000',
                                    TIER_2K: '2,000',
                                    TIER_10K: '10,000',
                                    TIER_100K: '100,000',
                                    TIER_UNLIMITED: 'Unlimited',
                                    UNLIMITED: 'Unlimited',
                                  } as Record<string, string>)[initialWhatsAppAccount.tier] ??
                                    initialWhatsAppAccount.tier.replace(/^TIER_/, '')}
                                </span>
                              </Badge>
                            ) : (
                              <Badge
                                variant='secondary'
                                className='inline-flex items-center px-3 py-1 border-0 rounded-md text-xs font-medium bg-muted/40 text-muted-foreground whitespace-nowrap'
                              >
                                24h Sent:{' '}
                                <span className='text-foreground ml-1'>
                                  {initialWhatsAppAccount.sent_today_contacts ?? 0}
                                </span>
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Account Specs */}
                        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs'>
                          <div className='p-3.5 rounded-lg bg-muted/20 border border-border/70 space-y-1.5'>
                            <span className='text-xs font-medium text-muted-foreground'>
                              WABA ID
                            </span>
                            <div className='font-mono font-medium truncate text-foreground'>
                              {initialWhatsAppAccount.waba_id}
                            </div>
                          </div>
                          <div className='p-3.5 rounded-lg bg-muted/20 border border-border/70 space-y-1.5'>
                            <span className='text-xs font-medium text-muted-foreground'>
                              Last Synced
                            </span>
                            <div className='font-medium truncate text-foreground'>
                              {initialWhatsAppAccount.last_synced_at || 'Never'}
                            </div>
                          </div>
                          <div className='p-3.5 rounded-lg bg-muted/20 border border-border/70 space-y-1.5'>
                            <span className='text-xs font-medium text-muted-foreground'>
                              Security
                            </span>
                            <div className='font-medium text-foreground flex items-center gap-1.5'>
                              <span className='size-1.5 rounded-full bg-emerald-500 shrink-0' />
                              <span>Token Encrypted</span>
                            </div>
                          </div>
                        </div>

                        {/* Webhook Configuration Section */}
                        <div className='space-y-3 pt-2'>
                          <div className='flex items-center gap-2'>
                            <h4 className='font-semibold text-xs text-foreground'>
                              Meta Webhook Setup
                            </h4>
                            <Badge
                              variant='outline'
                              className='text-[11px] font-normal rounded-md border-border/70 text-muted-foreground bg-muted/30'
                            >
                              Webhook Endpoint
                            </Badge>
                          </div>
                          <p className='text-xs text-muted-foreground leading-relaxed'>
                            Configure your Meta App Webhook to receive incoming customer messages
                            and message status updates.
                          </p>

                          <div className='space-y-3'>
                            <div className='space-y-1.5'>
                              <Label className='text-xs font-medium text-muted-foreground'>
                                Callback URL
                              </Label>
                              <div className='flex items-center gap-2'>
                                <Input
                                  readOnly
                                  value={initialWhatsAppAccount.webhook_url}
                                  className='h-8 text-xs font-mono bg-muted/40'
                                />
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() =>
                                    copyToClipboard(initialWhatsAppAccount.webhook_url, 'url')
                                  }
                                  className='h-8 px-2.5 shrink-0 gap-1 text-xs'
                                >
                                  {copiedUrl ? (
                                    <IconCheck className='size-3.5 text-emerald-500' />
                                  ) : (
                                    <IconCopy className='size-3.5' />
                                  )}
                                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                                </Button>
                              </div>
                            </div>

                            {initialWhatsAppAccount.webhook_verify_token ? (
                              <div className='space-y-1.5'>
                                <Label className='text-xs font-medium text-muted-foreground'>
                                  Verify Token
                                </Label>
                                <div className='flex items-center gap-2'>
                                  <Input
                                    readOnly
                                    value={initialWhatsAppAccount.webhook_verify_token}
                                    className='h-8 text-xs font-mono bg-muted/40'
                                  />
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={() =>
                                      copyToClipboard(
                                        initialWhatsAppAccount.webhook_verify_token!,
                                        'token'
                                      )
                                    }
                                    className='h-8 px-2.5 shrink-0 gap-1 text-xs'
                                  >
                                    {copiedToken ? (
                                      <IconCheck className='size-3.5 text-emerald-500' />
                                    ) : (
                                      <IconCopy className='size-3.5' />
                                    )}
                                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                                  </Button>
                                </div>
                              </div>
                            ) : initialWhatsAppAccount.has_webhook_verify_token ? (
                              <div className='space-y-1.5'>
                                <Label className='text-xs font-medium text-muted-foreground'>
                                  Verify Token
                                </Label>
                                <div className='flex items-center gap-2'>
                                  <div className='flex-1 h-8 rounded-md border border-input bg-muted/40 px-3 text-xs flex items-center text-muted-foreground'>
                                    •••••••••••••••••••• (Encrypted)
                                  </div>
                                  <Badge variant='outline' className='text-xs font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 rounded-md'>
                                    Active
                                  </Badge>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {isOwnerOrAdmin && (
                          <div className='flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/80'>
                            <div className='flex items-center gap-2'>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={handleTestConnection}
                                disabled={isTestingWhatsApp}
                                className='h-8 px-3 text-xs font-medium gap-1.5'
                              >
                                <IconRefresh
                                  className={`size-3.5 ${isTestingWhatsApp ? 'animate-spin' : ''}`}
                                />
                                <span>{isTestingWhatsApp ? 'Testing...' : 'Test Connection'}</span>
                              </Button>

                              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                <DialogTrigger
                                  render={
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='sm'
                                      className='h-8 px-3 text-xs font-medium gap-1.5'
                                    />
                                  }
                                >
                                  <IconEdit className='size-3.5' />
                                  <span>Edit Credentials</span>
                                </DialogTrigger>
                                <DialogContent className='sm:max-w-md'>
                                  <DialogHeader>
                                    <DialogTitle>Edit WhatsApp Credentials</DialogTitle>
                                    <DialogDescription>
                                      Update your Meta Cloud API access token or secret. Leave token
                                      fields empty to keep current encrypted values.
                                    </DialogDescription>
                                  </DialogHeader>

                                  <form onSubmit={handleUpdateWhatsApp} className='space-y-4 py-2'>
                                    <div className='space-y-1.5'>
                                      <Label htmlFor='edit-phone' className='text-xs'>
                                        Display Phone Number
                                      </Label>
                                      <Input
                                        id='edit-phone'
                                        value={editDisplayPhone}
                                        onChange={(e) => setEditDisplayPhone(e.target.value)}
                                        className='h-9 text-xs'
                                        required
                                      />
                                    </div>

                                    <div className='space-y-1.5'>
                                      <Label htmlFor='edit-token' className='text-xs'>
                                        New System User Access Token (Optional)
                                      </Label>
                                      <Input
                                        id='edit-token'
                                        type='password'
                                        value={editAccessToken}
                                        onChange={(e) => setEditAccessToken(e.target.value)}
                                        placeholder='Leave blank to keep existing token'
                                        className='h-9 text-xs'
                                      />
                                    </div>

                                    <div className='space-y-1.5'>
                                      <Label htmlFor='edit-secret' className='text-xs'>
                                        New App Secret (Optional)
                                      </Label>
                                      <Input
                                        id='edit-secret'
                                        type='password'
                                        value={editAppSecret}
                                        onChange={(e) => setEditAppSecret(e.target.value)}
                                        placeholder='Leave blank to keep existing secret'
                                        className='h-9 text-xs'
                                      />
                                    </div>

                                    <DialogFooter>
                                      <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={() => setIsEditDialogOpen(false)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type='submit'
                                        size='sm'
                                        disabled={isUpdatingWhatsApp}
                                      >
                                        {isUpdatingWhatsApp ? 'Updating...' : 'Save Updates'}
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                </DialogContent>
                              </Dialog>
                            </div>

                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    className='h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1'
                                  />
                                }
                              >
                                <IconTrash className='size-3.5' />
                                <span>Disconnect Account</span>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Disconnect WhatsApp Account?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove your Meta API credentials from this workspace.
                                    Customer live chat, AI automations, and lead pipelines will be
                                    locked until an account is reconnected.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDisconnectWhatsApp}
                                    disabled={isDisconnecting}
                                    className='bg-destructive text-white hover:bg-destructive/90 font-medium'
                                  >
                                    {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  /* Setup / Not Configured State */
                  <Card className='border-border/80'>
                    <CardContent className='p-6 space-y-6'>
                      <div className='flex items-start gap-3.5 pb-4 border-b border-border/80'>
                        <div className='flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5'>
                          <IconBrandWhatsapp className='size-5' />
                        </div>
                        <div className='space-y-1'>
                          <div className='flex items-center gap-2'>
                            <h3 className='font-semibold text-sm text-foreground'>
                              Connect WhatsApp Business API
                            </h3>
                            <Badge
                              variant='outline'
                              className='text-xs font-medium text-muted-foreground border-border/80 bg-muted/30 rounded-md'
                            >
                              Setup Required
                            </Badge>
                          </div>
                          <p className='text-xs text-muted-foreground leading-relaxed'>
                            Enter your Meta Cloud API credentials from your Meta Developer App to
                            unlock messaging and automated flows.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleConnectWhatsApp} className='space-y-4'>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                          <div className='space-y-1.5'>
                            <Label htmlFor='waba_id' className='text-xs font-medium'>
                              WhatsApp Business Account ID (WABA ID) *
                            </Label>
                            <Input
                              id='waba_id'
                              value={wabaId}
                              onChange={(e) => setWabaId(e.target.value)}
                              placeholder='e.g. 104829104829104'
                              className='h-9 text-xs font-mono'
                              autoComplete='off'
                              required
                            />
                          </div>

                          <div className='space-y-1.5'>
                            <Label htmlFor='phone_number_id' className='text-xs font-medium'>
                              Phone Number ID *
                            </Label>
                            <Input
                              id='phone_number_id'
                              value={phoneNumberId}
                              onChange={(e) => setPhoneNumberId(e.target.value)}
                              placeholder='e.g. 109283746192837'
                              className='h-9 text-xs font-mono'
                              autoComplete='off'
                              required
                            />
                          </div>
                        </div>

                        <div className='space-y-1.5'>
                          <Label htmlFor='display_phone_number' className='text-xs font-medium'>
                            Display Phone Number *
                          </Label>
                          <Input
                            id='display_phone_number'
                            value={displayPhoneNumber}
                            onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                            placeholder='e.g. +1 555 123 4567'
                            className='h-9 text-xs font-mono'
                            autoComplete='off'
                            required
                          />
                        </div>

                        <div className='space-y-1.5'>
                          <Label htmlFor='access_token' className='text-xs font-medium'>
                            Permanent Access Token (System User) *
                          </Label>
                          <div className='relative'>
                            <Input
                              id='access_token'
                              type={showAccessToken ? 'text' : 'password'}
                              value={accessToken}
                              onChange={(e) => setAccessToken(e.target.value)}
                              placeholder='EAAG...'
                              className='h-9 text-xs font-mono pr-9'
                              autoComplete='new-password'
                              required
                            />
                            <button
                              type='button'
                              onClick={() => setShowAccessToken(!showAccessToken)}
                              className='absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground cursor-pointer'
                            >
                              {showAccessToken ? (
                                <IconEyeOff className='size-4' />
                              ) : (
                                <IconEye className='size-4' />
                              )}
                            </button>
                          </div>
                          <p className='text-[11px] text-muted-foreground'>
                            Generated from Meta Business Manager &gt; System Users with{' '}
                            <span className='font-mono'>whatsapp_business_messaging</span> and{' '}
                            <span className='font-mono'>whatsapp_business_management</span> scopes.
                          </p>
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1'>
                          <div className='space-y-1.5'>
                            <Label htmlFor='app_secret' className='text-xs font-medium'>
                              App Secret (Optional)
                            </Label>
                            <div className='relative'>
                              <Input
                                id='app_secret'
                                type={showAppSecret ? 'text' : 'password'}
                                value={appSecret}
                                onChange={(e) => setAppSecret(e.target.value)}
                                placeholder='For webhook signature verification'
                                className='h-9 text-xs font-mono pr-9'
                              />
                              <button
                                type='button'
                                onClick={() => setShowAppSecret(!showAppSecret)}
                                className='absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground cursor-pointer'
                              >
                                {showAppSecret ? (
                                  <IconEyeOff className='size-4' />
                                ) : (
                                  <IconEye className='size-4' />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className='space-y-1.5'>
                            <div className='flex items-center justify-between'>
                              <Label
                                htmlFor='webhook_verify_token'
                                className='text-xs font-medium'
                              >
                                Webhook Verify Token
                              </Label>
                              <button
                                type='button'
                                onClick={() =>
                                  setWebhookVerifyToken(
                                    Array.from({ length: 40 }, () =>
                                      Math.floor(Math.random() * 16).toString(16)
                                    ).join('')
                                  )
                                }
                                className='text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer'
                              >
                                Regenerate
                              </button>
                            </div>
                            <Input
                              id='webhook_verify_token'
                              value={webhookVerifyToken}
                              onChange={(e) => setWebhookVerifyToken(e.target.value)}
                              className='h-9 text-xs font-mono'
                            />
                          </div>
                        </div>

                        <div className='pt-2'>
                          <Button
                            type='submit'
                            size='sm'
                            disabled={isConnectingWhatsApp || !isOwnerOrAdmin}
                            className='h-9 px-4 text-xs font-semibold gap-2'
                          >
                            {isConnectingWhatsApp && (
                              <IconRefresh className='size-3.5 animate-spin' />
                            )}
                            <IconBrandWhatsapp className='size-4' />
                            <span>Connect WhatsApp Account</span>
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </CrosshairRow>

          {/* Section 3: Team Members */}
          <CrosshairRow>
            <div className='flex flex-col md:flex-row gap-8 md:gap-12'>
              <div className='w-full md:w-80 shrink-0 space-y-3'>
                <div className='flex size-9 items-center justify-center rounded-md border border-border/80 bg-muted/50 dark:bg-neutral-900/60 text-foreground'>
                  <IconUsers className='size-4.5' />
                </div>
                <h2 className='mt-1 text-balance font-semibold text-xl tracking-tight text-foreground'>
                  Team Members
                </h2>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  Invite colleagues, assign operational roles, and manage access to customer
                  conversations.
                </p>
              </div>

              <div className='flex-1 min-w-0 space-y-6'>
                {/* Invite Teammate Card */}
                {isOwnerOrAdmin && (
                  <Card className='border-border/80'>
                    <CardContent className='p-6 space-y-4'>
                      <div className='flex items-center gap-2 text-foreground font-semibold text-sm'>
                        <IconUserPlus className='size-4 text-muted-foreground' />
                        <h3>Invite a teammate</h3>
                      </div>
                      <p className='text-xs text-muted-foreground leading-relaxed'>
                        They will receive an email invitation to join this workspace.
                      </p>

                      <form onSubmit={handleInvite} className='flex flex-col sm:flex-row gap-2'>
                        <Input
                          type='email'
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder='colleague@company.com'
                          className='h-9 text-xs flex-1'
                          required
                        />
                        <select
                          value={inviteRole}
                          onChange={(e) =>
                            setInviteRole(e.target.value as 'agent' | 'manager' | 'admin')
                          }
                          aria-label='Select role for teammate'
                          className='h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                        >
                          <option value='agent'>Agent</option>
                          <option value='manager'>Manager</option>
                          <option value='admin'>Admin</option>
                        </select>
                        <Button
                          type='submit'
                          size='sm'
                          disabled={isInviting}
                          className='h-9 px-4 text-xs shrink-0'
                        >
                          {isInviting ? 'Inviting...' : 'Send Invite'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* Pending Invitations (if any) */}
                {initialPendingInvitations.length > 0 && (
                  <div className='space-y-3'>
                    <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono'>
                      Pending Invitations ({initialPendingInvitations.length})
                    </h4>
                    <Card className='border-border/80'>
                      <CardContent className='p-0 divide-y divide-border/80'>
                        {initialPendingInvitations.map((inv) => (
                          <div
                            key={inv.id}
                            className='flex items-center justify-between p-3.5 gap-4'
                          >
                            <div className='min-w-0'>
                              <div className='text-xs font-medium text-foreground truncate'>
                                {inv.email}
                              </div>
                              <div className='text-[11px] text-muted-foreground capitalize'>
                                Role: {inv.role} · Expires soon
                              </div>
                            </div>
                            {isOwnerOrAdmin && (
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => handleCancelInvitation(inv.id)}
                                className='h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10'
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Active Members List */}
                <div className='space-y-3'>
                  <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono'>
                    Active Members ({initialMembers.length})
                  </h4>
                  <Card className='border-border/80'>
                    <CardContent className='p-0 divide-y divide-border/80'>
                      {initialMembers.map((member) => (
                        <div
                          key={member.id}
                          className='flex items-center justify-between p-4 gap-4'
                        >
                          <div className='flex items-center gap-3 min-w-0'>
                            <div className='size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold uppercase text-muted-foreground shrink-0 border border-border/60'>
                              {member.name.charAt(0)}
                            </div>
                            <div className='min-w-0'>
                              <div className='flex items-center gap-1.5'>
                                <span className='font-medium text-xs text-foreground truncate'>
                                  {member.name}
                                </span>
                                {member.is_you && (
                                  <Badge
                                    variant='secondary'
                                    className='text-[9px] px-1.5 py-0 h-4 font-mono'
                                  >
                                    You
                                  </Badge>
                                )}
                                {member.is_owner && (
                                  <Badge
                                    variant='outline'
                                    className='text-[9px] px-1.5 py-0 h-4 font-mono border-primary/30 text-primary'
                                  >
                                    Owner
                                  </Badge>
                                )}
                              </div>
                              <div className='text-[11px] text-muted-foreground truncate'>
                                {member.email}
                              </div>
                            </div>
                          </div>

                          <div className='flex items-center gap-2 shrink-0'>
                            <Badge
                              variant='outline'
                              className='text-[10px] uppercase font-mono tracking-wider'
                            >
                              {member.role}
                            </Badge>

                            {isOwnerOrAdmin && !member.is_you && !member.is_owner && (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button variant='ghost' size='icon' className='size-7' />
                                  }
                                >
                                  <IconDotsVertical className='size-3.5' />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end' className='text-xs'>
                                  <DropdownMenuItem
                                    onClick={() => handleChangeRole(member.id, 'admin')}
                                    disabled={member.role === 'admin'}
                                  >
                                    Set as Admin
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleChangeRole(member.id, 'manager')}
                                    disabled={member.role === 'manager'}
                                  >
                                    Set as Manager
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleChangeRole(member.id, 'agent')}
                                    disabled={member.role === 'agent'}
                                  >
                                    Set as Agent
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRemoveMember(member.id, member.name)}
                                    className='text-destructive focus:text-destructive'
                                  >
                                    <IconTrash className='size-3.5 mr-1.5' />
                                    Remove member
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CrosshairRow>
        </CrosshairContainer>
      </div>
  );
}
