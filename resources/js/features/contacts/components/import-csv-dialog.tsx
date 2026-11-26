'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { IconDownload } from '@tabler/icons-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ContactItem, TagItem } from '../types';

interface ParsedCsvRow {
  phone: string;
  name?: string;
  email?: string;
  company_name?: string;
  city?: string;
  state?: string;
}

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: TagItem[];
  onImported: (contacts: ContactItem[]) => void;
  getCsrfToken: () => string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function ImportCsvDialog({
  open,
  onOpenChange,
  tags,
  onImported,
  getCsrfToken,
}: ImportCsvDialogProps) {
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      toast.error('CSV must include a header row and at least 1 contact row.');
      setParsedRows([]);
      return;
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const findIdx = (candidates: string[]) =>
      headers.findIndex((h) => candidates.some((c) => h.includes(c)));

    const phoneIdx = findIdx(['phone', 'wa_id', 'mobile', 'whatsapp', 'number']);
    if (phoneIdx === -1) {
      toast.error('CSV must have a "phone", "mobile", or "whatsapp" column.');
      setParsedRows([]);
      return;
    }

    const nameIdx = findIdx(['name', 'full_name']);
    const emailIdx = findIdx(['email', 'mail']);
    const companyIdx = findIdx(['company', 'business']);
    const cityIdx = findIdx(['city']);
    const stateIdx = findIdx(['state']);

    const rows: ParsedCsvRow[] = [];
    for (let i = 1; i < lines.length && rows.length < 2000; i++) {
      const cols = parseCsvLine(lines[i]);
      const phone = cols[phoneIdx] ?? '';
      if (!phone) continue;

      rows.push({
        phone,
        name: nameIdx >= 0 ? cols[nameIdx] : undefined,
        email: emailIdx >= 0 ? cols[emailIdx] : undefined,
        company_name: companyIdx >= 0 ? cols[companyIdx] : undefined,
        city: cityIdx >= 0 ? cols[cityIdx] : undefined,
        state: stateIdx >= 0 ? cols[stateIdx] : undefined,
      });
    }

    setParsedRows(rows);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setIsImporting(true);
    try {
      const res = await fetch('/dashboard/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          rows: parsedRows,
          opt_in_status: 'opted_in',
          tag_ids: selectedTagIds.map((id) => Number(id)),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to import contacts.');
        return;
      }

      toast.success(data.message || 'Contacts imported successfully.');
      if (Array.isArray(data.contacts)) {
        onImported(data.contacts);
      }
      setFileName('');
      setParsedRows([]);
      setSelectedTagIds([]);
      onOpenChange(false);
    } catch {
      toast.error('Network error while importing contacts.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent = [
      'phone,name,email,company,city,state',
      '+919876543210,Rahul Patel,rahul@example.com,Patel Engineering,Ahmedabad,Gujarat',
      '+919811122333,Priya Sharma,priya@example.com,Sharma Metals,Surat,Gujarat',
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contacts-sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a .csv file with a <code className='font-mono'>phone</code> column (and optional{' '}
            <code className='font-mono'>name</code>, <code className='font-mono'>email</code>,{' '}
            <code className='font-mono'>company</code>, <code className='font-mono'>city</code>,{' '}
            <code className='font-mono'>state</code>).
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <label className='flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors'>
            <Icons.upload className='size-6 text-muted-foreground mb-2' />
            <span className='text-xs font-medium text-foreground'>
              {fileName ? fileName : 'Click to choose a CSV file'}
            </span>
            <span className='text-[11px] text-muted-foreground mt-1'>
              Up to 2,000 contacts per upload
            </span>
            <input
              type='file'
              accept='.csv,text/csv'
              onChange={handleFileChange}
              className='hidden'
            />
          </label>

          {parsedRows.length > 0 && (
            <div className='rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
              <Icons.circleCheck className='size-4 shrink-0' />
              <span>
                Ready to import <strong>{parsedRows.length}</strong> contacts.
              </span>
            </div>
          )}

          {tags.length > 0 && (
            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>Assign Tags to Imported Contacts</Label>
              <div className='flex flex-wrap gap-1.5'>
                {tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type='button'
                      onClick={() => toggleTag(tag.id)}
                      className='cursor-pointer'
                    >
                      <Badge
                        variant={active ? 'default' : 'secondary'}
                        className={cn(
                          'border-transparent text-xs',
                          active && 'bg-emerald-600 text-white hover:bg-emerald-600/90'
                        )}
                      >
                        {active && <Icons.check className='mr-1 size-3' />}
                        {tag.name}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className='sm:justify-between'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleDownloadSample}
            className='text-xs text-muted-foreground hover:text-foreground'
          >
            <IconDownload className='mr-1.5 size-3.5' />
            Download Sample CSV
          </Button>
          <div className='flex items-center gap-2'>
            <Button type='button' variant='outline' size='sm' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={isImporting || parsedRows.length === 0}
              onClick={handleImport}
            >
              {isImporting ? (
                <>
                  <Icons.spinner className='mr-1.5 size-3.5 animate-spin' />
                  Importing...
                </>
              ) : (
                `Import ${parsedRows.length > 0 ? parsedRows.length : ''} Contacts`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
