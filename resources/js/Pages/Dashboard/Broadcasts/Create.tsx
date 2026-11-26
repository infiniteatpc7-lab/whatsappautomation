import React, { useMemo, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Icons } from '@/components/icons';
import { IconDownload } from '@tabler/icons-react';
import { WhatsAppLockedState } from '@/components/whatsapp-locked-state';
import { IPhonePreview } from '@/features/templates/components/iphone-preview';
import type { TemplateComponent } from '@/features/templates/types';
import type { BroadcastQuota } from '@/features/broadcasts/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SharedProps } from '@/types';

interface ApprovedTemplateOption {
  id: string;
  name: string;
  language: string;
  category: string;
  header_type: string | null;
  body_text: string;
  components: TemplateComponent[];
}

interface TagOption {
  id: string;
  name: string;
  opted_in_count: number;
}

interface ContactOption {
  id: string;
  wa_id: string;
  name: string;
  company_name: string | null;
  tag_ids?: string[];
}

type CreateBroadcastPageProps = SharedProps & {
  hasConnectedAccount?: boolean;
  activeAccount?: {
    id: number;
    display_phone_number: string | null;
    verified_name: string | null;
  } | null;
  approvedTemplates?: ApprovedTemplateOption[];
  tags?: TagOption[];
  contacts?: ContactOption[];
  quota?: BroadcastQuota;
};

type VarSource = 'contact_name' | 'company_name' | 'city' | 'state' | 'phone' | 'static' | `csv:${string}`;

interface ParsedCsvRow {
  phone: string;
  name?: string;
  email?: string;
  company_name?: string;
  city?: string;
  state?: string;
  custom_fields?: Record<string, string>;
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

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function CreateBroadcastPage() {
  const {
    hasConnectedAccount,
    activeAccount,
    approvedTemplates = [],
    tags = [],
    contacts = [],
    quota = { tier: null, daily_limit: null, sent_today: 0, remaining: null },
  } = usePage<CreateBroadcastPageProps>().props;

  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<string>(approvedTemplates[0]?.id ?? '');
  const [audienceType, setAudienceType] = useState<'all_opted_in' | 'tags' | 'manual' | 'csv'>('all_opted_in');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<ParsedCsvRow[]>([]);
  const [variableMapping, setVariableMapping] = useState<
    Record<string, { source: VarSource; fallback: string }>
  >({});
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [smartSenderEnabled, setSmartSenderEnabled] = useState(true);
  const [retryWindowHours, setRetryWindowHours] = useState(36);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTemplate = useMemo(
    () => approvedTemplates.find((t) => t.id === templateId) ?? null,
    [approvedTemplates, templateId]
  );

  const headerComp = selectedTemplate?.components?.find((c) => c.type === 'HEADER');
  const footerComp = selectedTemplate?.components?.find((c) => c.type === 'FOOTER');
  const buttonsComp = selectedTemplate?.components?.find((c) => c.type === 'BUTTONS');

  const mediaHeaderFormat = useMemo(() => {
    const fmt = (headerComp?.format || '').toUpperCase();
    return ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(fmt) ? fmt : null;
  }, [headerComp]);

  const detectedVariables = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [];

    if (
      headerComp &&
      (headerComp.format === 'TEXT' || !headerComp.format) &&
      (headerComp.text || '').includes('{{1}}')
    ) {
      items.push({ key: 'header_1', label: 'Header {{1}}' });
    }

    const body = selectedTemplate?.body_text ?? '';
    const matches = body.match(/\{\{(\d+)\}\}/g) || [];
    const nums = Array.from(new Set(matches.map((m) => m.replace(/\D/g, '')))).sort(
      (a, b) => Number(a) - Number(b)
    );
    nums.forEach((n) => items.push({ key: n, label: `Body {{${n}}}` }));

    (buttonsComp?.buttons ?? []).forEach((btn, idx) => {
      if (btn.type === 'URL' && (btn.url || '').includes('{{1}}')) {
        items.push({ key: `button_${idx}`, label: `Btn #${idx + 1} {{1}}` });
      }
    });

    return items;
  }, [selectedTemplate, headerComp, buttonsComp]);

  const estimatedAudienceCount = useMemo(() => {
    if (audienceType === 'all_opted_in') return contacts.length;
    if (audienceType === 'tags') {
      if (selectedTagIds.length === 0) return 0;
      return contacts.filter((c) =>
        (c.tag_ids ?? []).some((id) => selectedTagIds.includes(id))
      ).length;
    }
    if (audienceType === 'csv') return csvRows.length;
    return selectedContactIds.length;
  }, [audienceType, contacts, selectedTagIds, selectedContactIds.length, csvRows.length]);

  const exceedsQuota =
    scheduleMode === 'now' &&
    quota.remaining !== null &&
    estimatedAudienceCount > quota.remaining;

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const updateVarMapping = (
    varNum: string,
    patch: Partial<{ source: VarSource; fallback: string }>
  ) => {
    setVariableMapping((prev) => ({
      ...prev,
      [varNum]: {
        source: prev[varNum]?.source ?? 'contact_name',
        fallback: prev[varNum]?.fallback ?? 'Customer',
        ...patch,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Campaign name is required.');
      return;
    }
    if (!templateId) {
      toast.error('Please select an approved WhatsApp template.');
      return;
    }
    if (audienceType === 'tags' && selectedTagIds.length === 0) {
      toast.error('Please select at least one tag.');
      return;
    }
    if (audienceType === 'manual' && selectedContactIds.length === 0) {
      toast.error('Please select at least one contact.');
      return;
    }
    if (audienceType === 'csv' && csvRows.length === 0) {
      toast.error('Please upload a CSV file with at least one contact.');
      return;
    }
    if (scheduleMode === 'later' && !scheduledAt) {
      toast.error('Please choose a schedule date and time.');
      return;
    }
    if (mediaHeaderFormat && !headerMediaUrl.trim()) {
      toast.error(`Please provide a public ${mediaHeaderFormat} URL for the template header.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/dashboard/broadcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          name,
          template_id: Number(templateId),
          audience_type: audienceType,
          tag_ids: audienceType === 'tags' ? selectedTagIds.map(Number) : [],
          contact_ids: audienceType === 'manual' ? selectedContactIds.map(Number) : [],
          csv_rows: audienceType === 'csv' ? csvRows : [],
          variable_mapping: variableMapping,
          header_media_url: headerMediaUrl.trim() || null,
          smart_sender_enabled: smartSenderEnabled,
          retry_window_hours: retryWindowHours,
          scheduled_at: scheduleMode === 'later' ? scheduledAt : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to create broadcast.');
        return;
      }

      toast.success(data.message || 'Broadcast queued!');
      router.visit('/dashboard/broadcasts');
    } catch {
      toast.error('Network error while creating broadcast.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPreviewBody = () => {
    const raw = selectedTemplate?.body_text ?? '';
    if (!raw) {
      return (
        <span className='text-muted-foreground/60 italic text-xs'>
          Select an approved template to preview...
        </span>
      );
    }

    const bodyComp = selectedTemplate?.components?.find((c) => c.type === 'BODY');
    const sampleValues: string[] = bodyComp?.example?.body_text?.[0] ?? [];

    const parts = raw.split(/(\{\{\d+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/^\{\{(\d+)\}\}$/);
      if (match) {
        const num = match[1];
        const rule = variableMapping[num];
        const metaSample = sampleValues[Number(num) - 1];
        let label = metaSample || part;
        if (rule) {
          if (rule.source.startsWith('csv:')) {
            const col = rule.source.slice(4);
            label = csvRows[0]?.custom_fields?.[col] || rule.fallback || `[${col}]`;
          } else {
            label = rule.fallback || (rule.source === 'static' ? part : `[${rule.source}]`);
          }
        }
        return (
          <span key={i} className='text-[#008069] dark:text-[#25D366] font-semibold'>
            {label}
          </span>
        );
      }
      return (
        <span key={i} className='whitespace-pre-wrap break-words leading-relaxed'>
          {part}
        </span>
      );
    });
  };

  const previewButtons = (buttonsComp?.buttons ?? [])
    .filter((b) => b.type === 'QUICK_REPLY' || b.type === 'URL' || b.type === 'PHONE_NUMBER')
    .map((b) => ({
      type: b.type as 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER',
      text: b.text,
      url: b.url,
      phone_number: b.phone_number,
    }));

  return (
    <PageContainer
      pageTitle='Create Broadcast Campaign'
      pageDescription='Select your target audience, map approved template variables, and dispatch within Meta rate limits.'
      pageHeaderAction={
        <Link
          href='/dashboard/broadcasts'
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs md:text-sm')}
        >
          <Icons.chevronLeft className='mr-1.5 size-3.5' />
          Back to Broadcasts
        </Link>
      }
    >
      {!hasConnectedAccount ? (
        <WhatsAppLockedState
          featureName='WhatsApp Broadcasts'
          description='Connect your Meta WhatsApp Cloud API credentials in Workspace settings before creating broadcasts.'
        />
      ) : (
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/60 p-3 text-xs text-muted-foreground backdrop-blur-sm'>
            <div className='flex items-center gap-2'>
              <Icons.badgeCheck className='size-4 text-emerald-500' />
              <span>
                Sender:{' '}
                <span className='font-medium text-foreground'>
                  {activeAccount?.verified_name || activeAccount?.display_phone_number}
                </span>
              </span>
            </div>
            {quota.daily_limit !== null && (
              <span>
                Remaining 24h Meta Quota:{' '}
                <span
                  className={cn(
                    'font-semibold',
                    exceedsQuota ? 'text-red-500' : 'text-emerald-500'
                  )}
                >
                  {quota.remaining?.toLocaleString()} / {quota.daily_limit.toLocaleString()} contacts
                </span>
              </span>
            )}
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            <div className='lg:col-span-7 space-y-6'>
              {/* Card 1: Campaign & Template */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-base font-semibold'>Campaign & Template</CardTitle>
                  <CardDescription className='text-xs'>
                    Only Meta-approved templates can be used to initiate broadcast conversations.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='campaign-name' className='text-xs font-semibold'>
                      Campaign Name <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='campaign-name'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder='e.g. November Product Offer'
                      className='h-9 text-xs'
                      required
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label htmlFor='campaign-template' className='text-xs font-semibold'>
                      Approved Template <span className='text-destructive'>*</span>
                    </Label>
                    <select
                      id='campaign-template'
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                    >
                      {approvedTemplates.length === 0 ? (
                        <option value=''>No approved templates found — sync or create one first</option>
                      ) : (
                        approvedTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.language}) — {t.category}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {mediaHeaderFormat && (
                    <div className='space-y-1.5'>
                      <Label htmlFor='header-media-url' className='text-xs font-semibold'>
                        Header {mediaHeaderFormat} URL <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        id='header-media-url'
                        type='url'
                        value={headerMediaUrl}
                        onChange={(e) => setHeaderMediaUrl(e.target.value)}
                        placeholder={`https://example.com/sample.${mediaHeaderFormat === 'IMAGE' ? 'jpg' : mediaHeaderFormat === 'VIDEO' ? 'mp4' : 'pdf'}`}
                        className='h-9 text-xs font-mono'
                        required
                      />
                    </div>
                  )}

                  {detectedVariables.length > 0 && (
                    <div className='rounded-lg border border-border/70 p-4 space-y-3 bg-muted/10'>
                      <Label className='text-xs font-semibold'>
                        Map Template Variables ({detectedVariables.length})
                      </Label>
                      {detectedVariables.map((item) => {
                        const rule = variableMapping[item.key] ?? {
                          source: 'contact_name' as VarSource,
                          fallback: 'Customer',
                        };
                        return (
                          <div
                            key={item.key}
                            className='grid grid-cols-1 sm:grid-cols-12 gap-2 items-center'
                          >
                            <Badge variant='secondary' className='sm:col-span-3 font-mono text-[11px] justify-center'>
                              {item.label}
                            </Badge>
                            <select
                              value={rule.source}
                              onChange={(e) =>
                                updateVarMapping(item.key, { source: e.target.value as VarSource })
                              }
                              className='sm:col-span-4 flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs'
                            >
                              <option value='contact_name'>Contact Name</option>
                              <option value='company_name'>Company Name</option>
                              <option value='city'>City</option>
                              <option value='state'>State</option>
                              <option value='phone'>WhatsApp Number</option>
                              <option value='static'>Static Custom Value</option>
                              {csvHeaders.length > 0 && (
                                <optgroup label='Uploaded CSV Columns'>
                                  {csvHeaders.map((col) => (
                                    <option key={col} value={`csv:${col}`}>
                                      CSV: {col}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                            <Input
                              value={rule.fallback}
                              onChange={(e) =>
                                updateVarMapping(item.key, { fallback: e.target.value })
                              }
                              placeholder={
                                rule.source === 'static' ? 'Custom text' : 'Fallback if empty'
                              }
                              className='sm:col-span-5 h-8 text-xs'
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Target Audience */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-base font-semibold'>Target Audience</CardTitle>
                  <CardDescription className='text-xs'>
                    Opted-out contacts are automatically excluded to protect your Meta quality rating.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='inline-flex flex-wrap items-center gap-1 bg-muted p-0.5 rounded-lg w-fit'>
                    {[
                      { id: 'all_opted_in', label: `All Opted-In (${contacts.length})` },
                      { id: 'tags', label: 'Filter by Tags' },
                      { id: 'manual', label: 'Select Contacts' },
                      { id: 'csv', label: 'Upload CSV' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type='button'
                        onClick={() =>
                          setAudienceType(opt.id as 'all_opted_in' | 'tags' | 'manual' | 'csv')
                        }
                        className={cn(
                          'rounded-md px-3 py-1 text-xs whitespace-nowrap transition-colors cursor-pointer',
                          audienceType === opt.id
                            ? 'bg-background text-foreground font-semibold shadow-xs'
                            : 'text-muted-foreground font-medium hover:text-foreground'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {audienceType === 'tags' && (
                    <div className='flex flex-wrap gap-1.5 pt-1'>
                      {tags.length === 0 ? (
                        <span className='text-xs text-muted-foreground'>
                          No tags found. Create tags in Contacts first.
                        </span>
                      ) : (
                        tags.map((tag) => {
                          const active = selectedTagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type='button'
                              onClick={() => toggleTag(tag.id)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                                active
                                  ? 'bg-primary text-primary-foreground shadow-xs'
                                  : 'bg-secondary text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {active ? <Icons.check className='size-3' /> : <Icons.add className='size-3 opacity-60' />}
                              <span>
                                {tag.name} ({tag.opted_in_count})
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {audienceType === 'manual' && (
                    <div className='rounded-lg border border-border/70 overflow-hidden'>
                      <div className='flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/60 text-xs'>
                        <label className='flex items-center gap-2 cursor-pointer font-medium text-foreground'>
                          <input
                            type='checkbox'
                            checked={
                              contacts.length > 0 &&
                              selectedContactIds.length === contacts.length
                            }
                            onChange={(e) =>
                              setSelectedContactIds(
                                e.target.checked ? contacts.map((c) => c.id) : []
                              )
                            }
                            className='rounded border-border'
                          />
                          <span>
                            {contacts.length > 0 &&
                            selectedContactIds.length === contacts.length
                              ? 'Deselect All Contacts'
                              : 'Select All Contacts'}
                          </span>
                        </label>
                        <span className='font-mono text-[11px] text-muted-foreground'>
                          {selectedContactIds.length} / {contacts.length} selected
                        </span>
                      </div>
                      <div className='max-h-48 overflow-y-auto p-2 space-y-1'>
                        {contacts.map((c) => {
                          const checked = selectedContactIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className='flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted/40 cursor-pointer'
                            >
                              <span className='flex items-center gap-2'>
                                <input
                                  type='checkbox'
                                  checked={checked}
                                  onChange={() => toggleContact(c.id)}
                                  className='rounded border-border'
                                />
                                <span className='font-medium text-foreground'>{c.name}</span>
                              </span>
                              <span className='font-mono text-[11px] text-muted-foreground'>
                                +{c.wa_id}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {audienceType === 'csv' && (
                    <div className='space-y-3'>
                      <label className='flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-center cursor-pointer hover:bg-muted/30 transition-colors'>
                        <Icons.upload className='size-5 text-muted-foreground mb-1.5' />
                        <span className='text-xs font-medium text-foreground'>
                          {csvFileName ? csvFileName : 'Click to choose a .csv file'}
                        </span>
                        <span className='text-[11px] text-muted-foreground mt-0.5'>
                          Columns: phone (required), name, email, company, city, state • Max 2,000 rows
                        </span>
                        <input
                          type='file'
                          accept='.csv,text/csv'
                          className='hidden'
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setCsvFileName(file.name);
                            const text = await file.text();
                            const lines = text
                              .split(/\r?\n/)
                              .map((l) => l.trim())
                              .filter(Boolean);
                            if (lines.length < 2) {
                              toast.error('CSV must include a header row and at least 1 contact.');
                              setCsvRows([]);
                              return;
                            }
                            const headers = parseCsvLine(lines[0]).map((h) =>
                              h.toLowerCase().replace(/\s+/g, '_')
                            );
                            const findIdx = (cands: string[]) =>
                              headers.findIndex((h) => cands.some((c) => h.includes(c)));
                            const phoneIdx = findIdx(['phone', 'wa_id', 'mobile', 'whatsapp', 'number']);
                            if (phoneIdx === -1) {
                              toast.error('CSV must have a "phone", "mobile", or "whatsapp" column.');
                              setCsvRows([]);
                              return;
                            }
                            const nameIdx = findIdx(['name', 'full_name']);
                            const emailIdx = findIdx(['email', 'mail']);
                            const companyIdx = findIdx(['company', 'business']);
                            const cityIdx = findIdx(['city']);
                            const stateIdx = findIdx(['state']);
                            const parsed: ParsedCsvRow[] = [];
                            for (let i = 1; i < lines.length && parsed.length < 2000; i++) {
                              const cols = parseCsvLine(lines[i]);
                              const phone = cols[phoneIdx] ?? '';
                              if (!phone) continue;
                              const customFields: Record<string, string> = {};
                              headers.forEach((h, idx) => {
                                if (h && cols[idx] !== undefined && cols[idx] !== '') {
                                  customFields[h] = cols[idx];
                                }
                              });
                              parsed.push({
                                phone,
                                name: nameIdx >= 0 ? cols[nameIdx] : undefined,
                                email: emailIdx >= 0 ? cols[emailIdx] : undefined,
                                company_name: companyIdx >= 0 ? cols[companyIdx] : undefined,
                                city: cityIdx >= 0 ? cols[cityIdx] : undefined,
                                state: stateIdx >= 0 ? cols[stateIdx] : undefined,
                                custom_fields: customFields,
                              });
                            }
                            setCsvHeaders(headers);
                            setCsvRows(parsed);
                            // Auto-map matching var_1 / var_2 / header_1 / button_0 columns
                            const autoMap: Record<string, { source: VarSource; fallback: string }> = {};
                            detectedVariables.forEach((v) => {
                              const expectedCol =
                                v.key === 'header_1' || v.key.startsWith('button_')
                                  ? v.key
                                  : `var_${v.key}`;
                              if (headers.includes(expectedCol)) {
                                autoMap[v.key] = {
                                  source: `csv:${expectedCol}`,
                                  fallback: 'Customer',
                                };
                              }
                            });
                            if (Object.keys(autoMap).length > 0) {
                              setVariableMapping((prev) => ({ ...prev, ...autoMap }));
                            }
                          }}
                        />
                      </label>

                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        {csvRows.length > 0 ? (
                          <span className='text-xs text-emerald-500 font-medium flex items-center gap-1.5'>
                            <Icons.circleCheck className='size-4' />
                            Ready: {csvRows.length} contacts ({csvHeaders.length} columns detected)
                          </span>
                        ) : (
                          <span className='text-[11px] text-muted-foreground'>
                            New contacts are saved automatically; opted-out contacts remain excluded.
                          </span>
                        )}
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='text-xs text-muted-foreground hover:text-foreground h-7 px-2'
                          onClick={() => {
                            const varCols = detectedVariables.map((v) =>
                              v.key === 'header_1' || v.key.startsWith('button_')
                                ? v.key
                                : `var_${v.key}`
                            );
                            const sampleBody =
                              selectedTemplate?.components?.find((c) => c.type === 'BODY')?.example
                                ?.body_text?.[0] ?? [];
                            const headerRow = ['phone', 'name', ...varCols].join(',');
                            const row1 = [
                              '"+919876543210"',
                              'Rahul Patel',
                              ...detectedVariables.map((v, i) => sampleBody[i] || `Sample_${v.key}`),
                            ].join(',');
                            const row2 = [
                              '"+919811122333"',
                              'Priya Sharma',
                              ...detectedVariables.map((v, i) => sampleBody[i] || `Value_${v.key}`),
                            ].join(',');
                            const csv = [headerRow, row1, row2].join('\n');
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedTemplate?.name || 'broadcast'}-sample.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <IconDownload className='mr-1.5 size-3.5' />
                          Download Sample CSV
                        </Button>
                      </div>
                    </div>
                  )}

                  {exceedsQuota && (
                    <div className='rounded-lg bg-red-500/10 p-3 text-xs text-red-500 flex items-start gap-2'>
                      <Icons.warning className='size-4 shrink-0 mt-0.5' />
                      <span>
                        Selected audience ({estimatedAudienceCount}) exceeds your remaining 24h Meta
                        limit ({quota.remaining}). Reduce audience or schedule for later.
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 3: Schedule */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-base font-semibold'>Delivery Timing</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      variant={scheduleMode === 'now' ? 'default' : 'outline'}
                      onClick={() => setScheduleMode('now')}
                      className='text-xs'
                    >
                      Send Immediately
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant={scheduleMode === 'later' ? 'default' : 'outline'}
                      onClick={() => setScheduleMode('later')}
                      className='text-xs'
                    >
                      Schedule for Later
                    </Button>
                  </div>

                  {scheduleMode === 'later' && (
                    <Input
                      type='datetime-local'
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className='h-9 text-xs max-w-xs'
                      required
                    />
                  )}
                </CardContent>
              </Card>

              {/* Card 4: Smart Sender (Auto-Retry Failed Deliveries) */}
              <Card>
                <CardContent className='p-4 sm:p-5 space-y-4'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex items-start gap-3'>
                      <div className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0'>
                        <Icons.refresh className='size-4' />
                      </div>
                      <div className='space-y-0.5'>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm font-semibold text-foreground'>Smart Sender</span>
                          <Badge variant='secondary' className='border-transparent text-[10px] font-semibold uppercase'>
                            New
                          </Badge>
                        </div>
                        <p className='text-xs text-muted-foreground'>
                          If a broadcast message fails to deliver (e.g. Meta cap or temporary rate limit), automatically retry within your chosen time window.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={smartSenderEnabled}
                      onCheckedChange={setSmartSenderEnabled}
                      aria-label='Toggle Smart Sender'
                    />
                  </div>

                  {smartSenderEnabled && (
                    <div className='flex flex-wrap items-center gap-2.5 pt-3 border-t border-border/60 text-xs'>
                      <Label htmlFor='retry-window-hours' className='text-xs font-medium text-foreground'>
                        Retry Time Window
                      </Label>
                      <span className='text-muted-foreground'>(max 72 hrs)</span>
                      <Input
                        id='retry-window-hours'
                        type='number'
                        min={1}
                        max={72}
                        value={retryWindowHours}
                        onChange={(e) =>
                          setRetryWindowHours(Math.max(1, Math.min(72, Number(e.target.value) || 1)))
                        }
                        className='h-8 w-20 text-xs font-mono text-center'
                      />
                      <span className='text-muted-foreground'>hours</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className='flex items-center justify-end gap-3'>
                <Link
                  href='/dashboard/broadcasts'
                  className={cn(buttonVariants({ variant: 'outline' }), 'text-xs md:text-sm')}
                >
                  Cancel
                </Link>
                <Button
                  type='submit'
                  disabled={isSubmitting || approvedTemplates.length === 0 || exceedsQuota}
                  className='text-xs md:text-sm font-semibold gap-2 px-5'
                >
                  {isSubmitting ? (
                    <>
                      <Icons.spinner className='size-4 animate-spin' />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Icons.send className='size-4' />
                      {scheduleMode === 'later' ? 'Schedule Broadcast' : 'Launch Broadcast'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Column: Live Phone Preview */}
            <div className='lg:col-span-5'>
              <div className='sticky top-6'>
                <IPhonePreview
                  verifiedName={activeAccount?.verified_name || 'Business Account'}
                  headerType={
                    headerComp &&
                    (headerComp.format === 'TEXT' || !headerComp.format) &&
                    headerComp.text
                      ? 'TEXT'
                      : 'NONE'
                  }
                  headerText={headerComp?.text || ''}
                  bodyContent={renderPreviewBody()}
                  footerText={footerComp?.text}
                  buttons={previewButtons}
                />
              </div>
            </div>
          </div>
        </form>
      )}
    </PageContainer>
  );
}
