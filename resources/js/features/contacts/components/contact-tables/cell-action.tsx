'use client';

import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import type { ContactItem } from '../../types';

interface CellActionProps {
  data: ContactItem;
  onEdit: (contact: ContactItem) => void;
  onToggleOptIn: (contact: ContactItem) => void;
  onDelete: (contact: ContactItem) => void;
}

export function CellAction({ data, onEdit, onToggleOptIn, onDelete }: CellActionProps) {
  const copyPhone = () => {
    navigator.clipboard.writeText(`+${data.wa_id}`);
    toast.success(`Number "+${data.wa_id}" copied to clipboard.`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Open menu</span>
            <Icons.ellipsis className='h-4 w-4' />
          </Button>
        }
      />
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onEdit(data)} className='whitespace-nowrap'>
            <Icons.edit className='mr-2 h-4 w-4 shrink-0' /> Edit Contact
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onToggleOptIn(data)}
            className='whitespace-nowrap'
          >
            <Icons.badgeCheck className='mr-2 h-4 w-4 shrink-0' />
            {data.opt_in_status === 'opted_out' ? 'Mark Opted In' : 'Mark Opted Out'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyPhone} className='whitespace-nowrap'>
            <Icons.copy className='mr-2 h-4 w-4 shrink-0' /> Copy Number
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.visit('/dashboard/chat')}
            className='whitespace-nowrap'
          >
            <Icons.chat className='mr-2 h-4 w-4 shrink-0' /> Open Live Chat
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(data)}
          className='whitespace-nowrap text-destructive focus:text-destructive'
        >
          <Icons.trash className='mr-2 h-4 w-4 shrink-0' /> Delete Contact
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
