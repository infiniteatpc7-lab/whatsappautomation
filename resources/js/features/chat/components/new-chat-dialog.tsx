'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { useChatStore } from '../utils/store';

export function NewChatDialog() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const { startNewConversation } = useChatStore();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    const success = await startNewConversation(phone.trim(), name.trim() || undefined);
    setLoading(false);

    if (success) {
      setOpen(false);
      setPhone('');
      setName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size='sm' className='gap-1.5 h-8 px-3 text-xs font-medium cursor-pointer'>
          <Icons.add className='size-3.5' />
          <span>New Chat</span>
        </Button>
      } />
      <DialogContent className='sm:max-w-md'>
        <form onSubmit={handleStart} className='space-y-4'>
          <DialogHeader>
            <DialogTitle>New WhatsApp Conversation</DialogTitle>
            <DialogDescription>
              Add a customer contact to start chatting anytime.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-1'>
            <div className='space-y-1.5'>
              <Label htmlFor='customer-phone' className='text-xs font-medium'>
                WhatsApp Phone Number <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='customer-phone'
                placeholder='e.g. +91 98765 43210 or 919876543210'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className='h-9 text-xs'
              />
              <p className='text-[10px] text-muted-foreground'>
                Include country code (e.g. +91 for India, +1 for USA).
              </p>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='customer-name' className='text-xs font-medium'>
                Customer Name (Optional)
              </Label>
              <Input
                id='customer-name'
                placeholder='e.g. Rajesh Kumar'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='h-9 text-xs'
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-2.5'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setOpen(false)}
              disabled={loading}
              className='text-xs'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              size='sm'
              disabled={loading || !phone.trim()}
              className='text-xs'
            >
              {loading ? (
                <>
                  <Icons.spinner className='mr-1.5 size-3.5 animate-spin' />
                  Creating...
                </>
              ) : (
                'Start Conversation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
