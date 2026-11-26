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
import type { CampaignItem } from '../../types';

interface CellActionProps {
  data: CampaignItem;
  onPause: (campaign: CampaignItem) => void;
  onResume: (campaign: CampaignItem) => void;
  onCancel: (campaign: CampaignItem) => void;
}

export function CellAction({ data, onPause, onResume, onCancel }: CellActionProps) {
  const canPause = data.status === 'processing';
  const canResume = data.status === 'paused';
  const canCancel = ['scheduled', 'processing', 'paused'].includes(data.status);

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
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.visit(`/dashboard/broadcasts/${data.id}`)}
            className='whitespace-nowrap'
          >
            <Icons.view className='mr-2 h-4 w-4 shrink-0' /> View Report
          </DropdownMenuItem>
          {canPause && (
            <DropdownMenuItem onClick={() => onPause(data)} className='whitespace-nowrap'>
              <Icons.warning className='mr-2 h-4 w-4 shrink-0' /> Pause Broadcast
            </DropdownMenuItem>
          )}
          {canResume && (
            <DropdownMenuItem onClick={() => onResume(data)} className='whitespace-nowrap'>
              <Icons.send className='mr-2 h-4 w-4 shrink-0' /> Resume Broadcast
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onCancel(data)}
              className='whitespace-nowrap text-destructive focus:text-destructive'
            >
              <Icons.close className='mr-2 h-4 w-4 shrink-0' /> Cancel Broadcast
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
