import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
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
  IconBuilding,
  IconUserPlus,
  IconUsers,
  IconDotsVertical,
  IconTrash,
  IconArrowRight,
  IconCheck
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Link } from '@inertiajs/react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Member';
  isYou?: boolean;
  joined: string;
}

const STORAGE_KEY = 'shadcn_workspace_data';

export default function Workspace() {
  const [workspaceName, setWorkspaceName] = useState('infiniteatdeveloper');
  const [workspaceSlug, setWorkspaceSlug] = useState('infiniteatdeveloper');
  const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      name: 'infiniteatpc7-lab',
      email: 'infiniteatpc7@gmail.com',
      role: 'Owner',
      isYou: true,
      joined: 'Nov 19, 2026'
    }
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Member'>('Member');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.workspaceName) setWorkspaceName(parsed.workspaceName);
        if (parsed.workspaceSlug) setWorkspaceSlug(parsed.workspaceSlug);
        if (parsed.members) setMembers(parsed.members);
      }
    } catch {
      // Ignore
    }
  }, []);

  const saveToStorage = (
    data: Partial<{ workspaceName: string; workspaceSlug: string; members: Member[] }>
  ) => {
    try {
      const current = {
        workspaceName: data.workspaceName ?? workspaceName,
        workspaceSlug: data.workspaceSlug ?? workspaceSlug,
        members: data.members ?? members
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Ignore
    }
  };

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      toast.error('Workspace name cannot be empty');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      saveToStorage({ workspaceName, workspaceSlug });
      setIsSaving(false);
      toast.success('Workspace updated successfully');
    }, 400);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === inviteEmail.trim().toLowerCase())) {
      toast.error('This user is already in the workspace');
      return;
    }

    const newMember: Member = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      joined: 'Today'
    };

    const updated = [...members, newMember];
    setMembers(updated);
    saveToStorage({ members: updated });
    setInviteEmail('');
    toast.success(`Invitation sent to ${inviteEmail}`);
  };

  const handleRemoveMember = (id: string, name: string) => {
    const updated = members.filter((m) => m.id !== id);
    setMembers(updated);
    saveToStorage({ members: updated });
    toast.success(`Removed ${name} from workspace`);
  };

  const handleChangeRole = (id: string, newRole: 'Admin' | 'Member') => {
    const updated = members.map((m) => (m.id === id ? { ...m, role: newRole } : m));
    setMembers(updated);
    saveToStorage({ members: updated });
    toast.success(`Role updated to ${newRole}`);
  };

  return (
    <DashboardLayout>
      <div className='flex flex-1 flex-col gap-8 p-4 md:p-8 max-w-5xl mx-auto w-full'>
        {/* Top Banner */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b'>
          <div className='space-y-1.5'>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className='text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5'
              >
                Free Plan
              </Badge>
            </div>
            <div className='flex items-center gap-2'>
              <IconBuilding className='size-6 text-foreground' />
              <h1 className='text-2xl font-bold tracking-tight'>Workspace</h1>
            </div>
            <p className='text-sm text-muted-foreground'>
              {workspaceName}: its name, who&apos;s in it, and who you invite next.
            </p>
          </div>

          <Button
            variant='outline'
            size='sm'
            render={<Link href='/dashboard/notifications' />}
            className='self-start sm:self-center gap-1.5'
          >
            <span>Your account</span>
            <IconArrowRight className='size-3.5' />
          </Button>
        </div>

        {/* Grid Sections */}
        <div className='grid gap-10'>
          {/* Section 1: Name and URL */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 items-start'>
            <div className='space-y-1.5 md:sticky md:top-20'>
              <div className='flex items-center gap-2 text-foreground font-semibold'>
                <IconBuilding className='size-4 text-muted-foreground' />
                <h3>Name and URL</h3>
              </div>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                How members see it, and its URL name. Everyone in it shares its Pro access.
              </p>
            </div>

            <div className='md:col-span-2'>
              <Card>
                <CardContent className='p-6 space-y-6'>
                  {/* Workspace Preview Badge */}
                  <div className='flex items-center gap-3.5 pb-4 border-b'>
                    <div className='size-11 rounded-lg bg-primary/10 text-primary font-bold text-lg flex items-center justify-center uppercase ring-1 ring-primary/20'>
                      {workspaceName.charAt(0) || 'W'}
                    </div>
                    <div className='space-y-0.5'>
                      <div className='font-semibold text-sm leading-none'>{workspaceName}</div>
                      <div className='text-xs text-muted-foreground font-mono'>/{workspaceSlug}</div>
                      <div className='text-[11px] text-muted-foreground/75'>
                        Owner · {members.length} {members.length === 1 ? 'member' : 'members'}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSaveChanges} className='space-y-4'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='workspace-name' className='text-xs font-medium'>
                        Workspace Name
                      </Label>
                      <Input
                        id='workspace-name'
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder='Workspace name'
                      />
                      <p className='text-[11px] text-muted-foreground'>
                        How members see your workspace.
                      </p>
                    </div>

                    <div className='space-y-1.5'>
                      <Label htmlFor='workspace-slug' className='text-xs font-medium'>
                        Slug
                      </Label>
                      <div className='flex items-center rounded-md border bg-muted/30 focus-within:bg-background focus-within:ring-1 focus-within:ring-ring'>
                        <span className='select-none pl-3 text-xs text-muted-foreground font-mono'>
                          shadcn.io/
                        </span>
                        <Input
                          id='workspace-slug'
                          value={workspaceSlug}
                          onChange={(e) =>
                            setWorkspaceSlug(
                              e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                            )
                          }
                          placeholder='workspace-slug'
                          className='border-0 bg-transparent shadow-none focus-visible:ring-0 font-mono text-xs pl-0.5'
                        />
                      </div>
                      <p className='text-[11px] text-muted-foreground'>
                        The URL name: lowercase letters, numbers, and hyphens.
                      </p>
                    </div>

                    <Button type='submit' size='sm' disabled={isSaving} className='gap-1.5'>
                      {isSaving && <IconCheck className='size-3.5 animate-spin' />}
                      Save changes
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section 2: Invite a teammate */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 items-start'>
            <div className='space-y-1.5 md:sticky md:top-20'>
              <div className='flex items-center gap-2 text-foreground font-semibold'>
                <IconUserPlus className='size-4 text-muted-foreground' />
                <h3>Invite a teammate</h3>
              </div>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                They join with their email and share the workspace&apos;s Pro access.
              </p>
            </div>

            <div className='md:col-span-2'>
              <Card>
                <CardContent className='p-6 space-y-5'>
                  <div className='rounded-md bg-muted/40 border p-3.5 text-xs text-muted-foreground leading-relaxed'>
                    Invite your team with Pro. Team plan includes 5 seats with owner included;
                    Organization includes unlimited seats.
                  </div>

                  <form onSubmit={handleInvite} className='space-y-4'>
                    <div className='flex flex-col sm:flex-row gap-2'>
                      <Input
                        type='email'
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder='colleague@company.com'
                        className='flex-1'
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'Admin' | 'Member')}
                        className='h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                      >
                        <option value='Member'>Member</option>
                        <option value='Admin'>Admin</option>
                      </select>
                      <Button type='submit' size='sm' className='shrink-0'>
                        Invite
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section 3: Members */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 items-start'>
            <div className='space-y-1.5 md:sticky md:top-20'>
              <div className='flex items-center gap-2 text-foreground font-semibold'>
                <IconUsers className='size-4 text-muted-foreground' />
                <h3>Members</h3>
              </div>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                {members.length} {members.length === 1 ? 'member' : 'members'}. Change a role or
                remove someone at the row&apos;s end.
              </p>
            </div>

            <div className='md:col-span-2'>
              <Card>
                <CardContent className='p-0 divide-y'>
                  {members.map((member) => (
                    <div key={member.id} className='flex items-center justify-between p-4 gap-4'>
                      <div className='flex items-center gap-3 min-w-0'>
                        <div className='size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold uppercase text-muted-foreground shrink-0'>
                          {member.name.charAt(0)}
                        </div>
                        <div className='min-w-0'>
                          <div className='flex items-center gap-1.5'>
                            <span className='font-medium text-xs truncate'>{member.name}</span>
                            {member.isYou && (
                              <Badge variant='secondary' className='text-[9px] px-1 py-0 h-4'>
                                Creator · You
                              </Badge>
                            )}
                          </div>
                          <div className='text-[11px] text-muted-foreground truncate'>
                            {member.email}
                          </div>
                        </div>
                      </div>

                      <div className='flex items-center gap-2 shrink-0'>
                        <span className='text-xs text-muted-foreground'>{member.role}</span>
                        {!member.isYou && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant='ghost' size='icon' className='size-7'>
                                  <IconDotsVertical className='size-3.5' />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align='end' className='text-xs'>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleChangeRole(
                                    member.id,
                                    member.role === 'Admin' ? 'Member' : 'Admin'
                                  )
                                }
                              >
                                Make {member.role === 'Admin' ? 'Member' : 'Admin'}
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
      </div>
    </DashboardLayout>
  );
}
