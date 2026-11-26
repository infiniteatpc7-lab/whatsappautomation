'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ContactItem, OptInStatus, TagItem } from '../types';

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactItem | null;
  tags: TagItem[];
  onSaved: (contact: ContactItem, isEdit: boolean) => void;
  onTagCreated: (tag: TagItem) => void;
  getCsrfToken: () => string;
}

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  tags,
  onSaved,
  onTagCreated,
  getCsrfToken,
}: ContactFormDialogProps) {
  const isEdit = Boolean(contact);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [optInStatus, setOptInStatus] = useState<OptInStatus>('opted_in');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPhone(contact ? `+${contact.wa_id}` : '');
      setName(contact?.name ?? '');
      setEmail(contact?.email ?? '');
      setCompanyName(contact?.company_name ?? '');
      setCity(contact?.city ?? '');
      setStateName(contact?.state ?? '');
      setOptInStatus(contact?.opt_in_status ?? 'opted_in');
      setSelectedTagIds(contact?.tags.map((t) => t.id) ?? []);
      setNewTagName('');
    }
  }, [open, contact]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    setIsCreatingTag(true);
    try {
      const res = await fetch('/dashboard/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to create tag.');
        return;
      }
      if (data.tag) {
        onTagCreated(data.tag);
        setSelectedTagIds((prev) =>
          prev.includes(data.tag.id) ? prev : [...prev, data.tag.id]
        );
        setNewTagName('');
      }
    } catch {
      toast.error('Network error while creating tag.');
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !phone.trim()) {
      toast.error('WhatsApp phone number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      let tagIdsToSave = [...selectedTagIds];

      // If user typed a new tag name and clicked Save without clicking "+ Add Tag", create it automatically
      const pendingTag = newTagName.trim();
      if (pendingTag) {
        const tagRes = await fetch('/dashboard/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': getCsrfToken(),
          },
          credentials: 'same-origin',
          body: JSON.stringify({ name: pendingTag }),
        });
        const tagData = await tagRes.json();
        if (tagRes.ok && tagData.tag) {
          onTagCreated(tagData.tag);
          if (!tagIdsToSave.includes(tagData.tag.id)) {
            tagIdsToSave.push(tagData.tag.id);
          }
          setNewTagName('');
        }
      }

      const endpoint = isEdit && contact ? `/dashboard/contacts/${contact.id}` : '/dashboard/contacts';
      const res = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          phone,
          name: name || null,
          email: email || null,
          company_name: companyName || null,
          city: city || null,
          state: stateName || null,
          opt_in_status: optInStatus,
          tag_ids: tagIdsToSave.map((id) => Number(id)),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to save contact.');
        return;
      }

      toast.success(data.message || (isEdit ? 'Contact updated.' : 'Contact added.'));
      if (data.contact) {
        onSaved(data.contact, isEdit);
      }
      onOpenChange(false);
    } catch {
      toast.error('Network error while saving contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update contact details, tags, and broadcast opt-in status.'
              : 'Add a WhatsApp contact with country code (e.g. +91 9876543210).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='contact-phone' className='text-xs font-semibold'>
                WhatsApp Number <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='contact-phone'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder='+91 9876543210'
                className='h-9 text-xs font-mono'
                required
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='contact-name' className='text-xs font-semibold'>
                Full Name
              </Label>
              <Input
                id='contact-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. Rahul Patel'
                className='h-9 text-xs'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='contact-email' className='text-xs font-semibold'>
                Email
              </Label>
              <Input
                id='contact-email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='name@company.com'
                className='h-9 text-xs'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='contact-company' className='text-xs font-semibold'>
                Company
              </Label>
              <Input
                id='contact-company'
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder='Company name'
                className='h-9 text-xs'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='contact-city' className='text-xs font-semibold'>
                City
              </Label>
              <Input
                id='contact-city'
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder='City'
                className='h-9 text-xs'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='contact-state' className='text-xs font-semibold'>
                State
              </Label>
              <Input
                id='contact-state'
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder='State'
                className='h-9 text-xs'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='contact-optin' className='text-xs font-semibold'>
                Opt-In Status
              </Label>
              <select
                id='contact-optin'
                value={optInStatus}
                onChange={(e) => setOptInStatus(e.target.value as OptInStatus)}
                className='flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              >
                <option value='opted_in'>Opted In</option>
                <option value='opted_out'>Opted Out</option>
                <option value='unknown'>Unknown</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-semibold'>Tags (for Broadcast Segmentation)</Label>
              <span className='text-[11px] text-muted-foreground'>Click a tag to select / remove</span>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {tags.map((tag) => {
                const active = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type='button'
                    onClick={() => toggleTag(tag.id)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer border',
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600/90'
                        : 'bg-secondary/60 text-muted-foreground border-border/60 hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {active ? (
                      <Icons.check className='size-3 shrink-0' />
                    ) : (
                      <Icons.add className='size-3 shrink-0 opacity-60' />
                    )}
                    <span>{tag.name}</span>
                  </button>
                );
              })}
            </div>
            <div className='flex items-center gap-2 pt-1'>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
                placeholder='New tag name (e.g. VIP, Leads)...'
                className='h-8 text-xs'
              />
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleCreateTag}
                disabled={isCreatingTag || !newTagName.trim()}
                className='h-8 text-xs shrink-0'
              >
                <Icons.add className='mr-1 size-3.5' />
                Add Tag
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' size='sm' disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icons.spinner className='mr-1.5 size-3.5 animate-spin' />
                  Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Add Contact'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
