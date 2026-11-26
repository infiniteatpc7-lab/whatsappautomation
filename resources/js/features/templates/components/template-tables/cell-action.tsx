'use client';

import { useState } from 'react';
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
import type { WhatsAppTemplate } from '../../types';
import { TemplatePreviewDialog } from '../template-preview-dialog';

interface CellActionProps {
  data: WhatsAppTemplate;
}

export function CellAction({ data }: CellActionProps) {
  const [openPreview, setOpenPreview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = Boolean(
    data.meta_template_id && ['APPROVED', 'REJECTED', 'PAUSED'].includes(data.status)
  );

  const copyName = () => {
    navigator.clipboard.writeText(data.name);
    toast.success(`Template name "${data.name}" copied to clipboard.`);
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
      const csrf = match ? decodeURIComponent(match[1]) : '';
      const res = await fetch(`/dashboard/templates/${data.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'X-XSRF-TOKEN': csrf,
        },
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message || 'Failed to delete template.');
        return;
      }
      toast.success(json.message || 'Template deleted.');
      router.reload({ only: ['initialTemplates'] });
    } catch {
      toast.error('Network error while deleting template.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <TemplatePreviewDialog
        template={data}
        open={openPreview}
        onOpenChange={setOpenPreview}
      />
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
            <DropdownMenuItem onClick={() => setOpenPreview(true)} className='whitespace-nowrap'>
              <Icons.view className='mr-2 h-4 w-4 shrink-0' /> Preview Template
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canEdit}
              onClick={() => canEdit && router.visit(`/dashboard/templates/${data.id}/edit`)}
              className='whitespace-nowrap'
            >
              <Icons.edit className='mr-2 h-4 w-4 shrink-0' /> Edit Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyName} className='whitespace-nowrap'>
              <Icons.copy className='mr-2 h-4 w-4 shrink-0' /> Copy Name
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className='whitespace-nowrap'
            onClick={() =>
              window.open(
                'https://business.facebook.com/wa/manage/message-templates/',
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            <Icons.externalLink className='mr-2 h-4 w-4 shrink-0' /> View in Meta
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isDeleting}
            onClick={handleDelete}
            className='whitespace-nowrap text-destructive focus:text-destructive'
          >
            <Icons.trash className='mr-2 h-4 w-4 shrink-0' />
            {isDeleting ? 'Deleting...' : 'Delete Template'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
