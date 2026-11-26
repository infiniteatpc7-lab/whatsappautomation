import React, { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { WhatsAppLockedState } from '@/components/whatsapp-locked-state';
import { ContactTable } from '@/features/contacts/components/contact-tables/contact-table';
import { ContactFormDialog } from '@/features/contacts/components/contact-form-dialog';
import { ImportCsvDialog } from '@/features/contacts/components/import-csv-dialog';
import type { ContactItem, TagItem } from '@/features/contacts/types';
import { toast } from 'sonner';
import { SharedProps } from '@/types';

type ContactsPageProps = SharedProps & {
  initialContacts?: ContactItem[];
  initialTags?: TagItem[];
  hasConnectedAccount?: boolean;
};

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function ContactsPage() {
  const { initialContacts = [], initialTags = [], hasConnectedAccount } =
    usePage<ContactsPageProps>().props;

  const [contacts, setContacts] = useState<ContactItem[]>(initialContacts);
  const [tags, setTags] = useState<TagItem[]>(initialTags);

  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const optedInCount = contacts.filter((c) => c.opt_in_status === 'opted_in').length;
  const optedOutCount = contacts.filter((c) => c.opt_in_status === 'opted_out').length;

  const handleOpenCreate = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const handleEdit = (contact: ContactItem) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleSaved = (saved: ContactItem, isEdit: boolean) => {
    setContacts((prev) =>
      isEdit ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev]
    );
    router.reload({ only: ['initialContacts', 'initialTags'] });
  };

  const handleTagCreated = (tag: TagItem) => {
    setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
  };

  const handleToggleOptIn = async (contact: ContactItem) => {
    const nextStatus = contact.opt_in_status === 'opted_out' ? 'opted_in' : 'opted_out';
    try {
      const res = await fetch(`/dashboard/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ opt_in_status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to update opt-in status.');
        return;
      }

      if (data.contact) {
        setContacts((prev) => prev.map((c) => (c.id === data.contact.id ? data.contact : c)));
      }
      toast.success(
        nextStatus === 'opted_in' ? 'Contact marked as Opted In.' : 'Contact marked as Opted Out.'
      );
    } catch {
      toast.error('Network error while updating contact.');
    }
  };

  const handleDelete = async (contact: ContactItem) => {
    try {
      const res = await fetch(`/dashboard/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete contact.');
        return;
      }

      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      toast.success('Contact deleted.');
    } catch {
      toast.error('Network error while deleting contact.');
    }
  };

  return (
    <PageContainer
      pageTitle='Contacts & Audience'
      pageDescription='Manage WhatsApp contacts, segment audiences with tags, and track opt-in compliance for broadcasts.'
      pageHeaderAction={
        hasConnectedAccount ? (
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              onClick={handleOpenCreate}
              className='text-xs md:text-sm font-semibold'
            >
              <Icons.add className='mr-1.5 h-3.5 w-3.5' />
              Add Contact
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setImportOpen(true)}
              className='text-xs md:text-sm'
            >
              <Icons.upload className='mr-1.5 h-3.5 w-3.5' />
              Import CSV
            </Button>
          </div>
        ) : null
      }
    >
      {hasConnectedAccount ? (
        <>
          <div className='flex flex-1 flex-col space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/60 p-3 text-xs text-muted-foreground backdrop-blur-sm'>
              <div className='flex flex-wrap items-center gap-4'>
                <span>
                  Total Contacts:{' '}
                  <span className='font-semibold text-foreground'>{contacts.length}</span>
                </span>
                <span>
                  Opted In:{' '}
                  <span className='font-semibold text-emerald-500'>{optedInCount}</span>
                </span>
                <span>
                  Opted Out:{' '}
                  <span className='font-semibold text-red-500'>{optedOutCount}</span>
                </span>
                <span>
                  Tags: <span className='font-semibold text-foreground'>{tags.length}</span>
                </span>
              </div>
              <span className='text-[11px] text-muted-foreground'>
                Opted-out contacts are automatically excluded from broadcasts.
              </span>
            </div>

            <ContactTable
              data={contacts}
              onEdit={handleEdit}
              onToggleOptIn={handleToggleOptIn}
              onDelete={handleDelete}
            />
          </div>

          <ContactFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            contact={editingContact}
            tags={tags}
            onSaved={handleSaved}
            onTagCreated={handleTagCreated}
            getCsrfToken={getCsrfToken}
          />

          <ImportCsvDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            tags={tags}
            onImported={setContacts}
            getCsrfToken={getCsrfToken}
          />
        </>
      ) : (
        <WhatsAppLockedState
          featureName='Contacts & Audience'
          description='Connect your Meta WhatsApp Cloud API credentials in Workspace settings to manage contacts, import CSV audiences, and track opt-ins.'
        />
      )}
    </PageContainer>
  );
}
