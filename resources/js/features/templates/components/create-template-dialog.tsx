'use client';

import React, { useState, useId } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WhatsAppTemplate } from '../types';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated?: (template: WhatsAppTemplate) => void;
}

interface TemplateButtonForm {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  url_example?: string;
  phone_number?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt_BR', label: 'Portuguese (Brazil)' },
  { code: 'ar', label: 'Arabic' },
];

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onTemplateCreated,
}: CreateTemplateDialogProps) {
  const formId = useId();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY'>('MARKETING');
  const [language, setLanguage] = useState('en_US');

  // Header
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerExample, setHeaderExample] = useState('');

  // Body
  const [bodyText, setBodyText] = useState('');
  const [bodyExamples, setBodyExamples] = useState<string[]>([]);

  // Footer
  const [footerText, setFooterText] = useState('');

  // Buttons
  const [buttons, setButtons] = useState<TemplateButtonForm[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreviewSamples, setShowPreviewSamples] = useState(false);

  // Auto-detect variables {{1}}, {{2}} in body
  const detectedVariables = React.useMemo(() => {
    const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const unique = Array.from(new Set(matches));
    return unique.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);
      return numA - numB;
    });
  }, [bodyText]);

  // Sync bodyExamples array with count of variables
  React.useEffect(() => {
    setBodyExamples((prev) => {
      const next = [...prev];
      while (next.length < detectedVariables.length) {
        next.push('');
      }
      return next.slice(0, detectedVariables.length);
    });
  }, [detectedVariables.length]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Force lowercase alphanumeric and underscores
    const slug = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    setName(slug);
  };

  const handleInsertVariable = () => {
    const nextNum = detectedVariables.length + 1;
    setBodyText((prev) => `${prev} {{${nextNum}}}`.trim());
  };

  const handleAddButton = () => {
    if (buttons.length >= 3) {
      toast.error('Standard templates support up to 3 interactive buttons.');
      return;
    }
    setButtons((prev) => [...prev, { type: 'QUICK_REPLY', text: '' }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index: number, patch: Partial<TemplateButtonForm>) => {
    setButtons((prev) =>
      prev.map((btn, i) => (i === index ? { ...btn, ...patch } : btn))
    );
  };

  const resetForm = () => {
    setName('');
    setCategory('MARKETING');
    setLanguage('en_US');
    setHeaderType('NONE');
    setHeaderText('');
    setHeaderExample('');
    setBodyText('');
    setBodyExamples([]);
    setFooterText('');
    setButtons([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Template name is required.');
      return;
    }

    if (!bodyText.trim()) {
      toast.error('Body text is required.');
      return;
    }

    // Verify sequential numbering
    for (let i = 0; i < detectedVariables.length; i++) {
      const expected = `{{${i + 1}}}`;
      if (detectedVariables[i] !== expected) {
        toast.error(
          `Variables must be strictly sequential starting at {{1}}. Missing or skipped ${expected}.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/dashboard/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          name,
          category,
          language,
          header_type: headerType,
          header_text: headerType === 'TEXT' ? headerText : null,
          header_example: headerType === 'TEXT' && headerText.includes('{{1}}') ? headerExample : null,
          body_text: bodyText,
          body_examples: bodyExamples,
          footer_text: footerText || null,
          buttons: buttons.length > 0 ? buttons : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || 'Failed to create template on Meta.');
        return;
      }

      toast.success(data.message || 'Template submitted to Meta successfully!');
      if (data.template && onTemplateCreated) {
        onTemplateCreated(data.template);
      }
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Network error while communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live WhatsApp preview text with either {{1}} or sample replacement
  const renderPreviewBody = () => {
    if (!bodyText.trim()) {
      return <span className='text-muted-foreground/60 italic'>Type body message in the editor...</span>;
    }

    let rendered = bodyText;
    if (showPreviewSamples) {
      detectedVariables.forEach((v, idx) => {
        const sample = bodyExamples[idx]?.trim() || `[Sample ${idx + 1}]`;
        rendered = rendered.split(v).join(sample);
      });
      return <span className='whitespace-pre-wrap break-words leading-relaxed text-xs'>{rendered}</span>;
    }

    // Highlight tags
    const parts = bodyText.split(/(\{\{\d+\}\})/g);
    return parts.map((part, i) => {
      if (part.match(/^\{\{\d+\}\}$/)) {
        return (
          <span
            key={i}
            className='inline-block rounded bg-primary/20 text-primary font-mono text-[11px] px-1 py-0.5 mx-0.5 font-semibold'
          >
            {part}
          </span>
        );
      }
      return <span key={i} className='whitespace-pre-wrap break-words leading-relaxed text-xs'>{part}</span>;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[92vh] overflow-y-auto p-4 md:p-6'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <DialogTitle className='text-lg font-bold'>Create WhatsApp Template</DialogTitle>
            <Badge variant='outline' className='text-[10px] font-mono'>Meta Cloud API</Badge>
          </div>
          <DialogDescription className='text-xs text-muted-foreground'>
            Draft and submit a message template directly to Meta. Once approved, it can be used for re-engagement and broadcast campaigns.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} id={formId} className='grid grid-cols-1 md:grid-cols-12 gap-6 mt-2'>
          {/* Left Column: Form Controls (7 cols) */}
          <div className='md:col-span-7 space-y-4 text-xs'>
            {/* Name, Category, Language */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='template-name' className='text-xs font-semibold'>
                  Template Name <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='template-name'
                  placeholder='e.g. order_delivery_update'
                  value={name}
                  onChange={handleNameChange}
                  className='h-8 text-xs font-mono'
                  required
                />
                <p className='text-[10px] text-muted-foreground'>
                  Lowercase letters, numbers, and underscores only.
                </p>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='template-category' className='text-xs font-semibold'>
                  Category <span className='text-destructive'>*</span>
                </Label>
                <select
                  id='template-category'
                  value={category}
                  onChange={(e) => setCategory(e.target.value as 'MARKETING' | 'UTILITY')}
                  className='flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                >
                  <option value='MARKETING'>MARKETING (Promotions, sales, offers)</option>
                  <option value='UTILITY'>UTILITY (Transactional order, alert, updates)</option>
                </select>
                <p className='text-[10px] text-muted-foreground'>
                  Utility templates must have zero promotional wording.
                </p>
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='template-language' className='text-xs font-semibold'>
                Language <span className='text-destructive'>*</span>
              </Label>
              <select
                id='template-language'
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className='flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label} ({lang.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Header Component */}
            <div className='rounded-lg border border-border/70 p-3 space-y-2 bg-muted/10'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold'>Header (Optional)</Label>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => setHeaderType('NONE')}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded transition-colors',
                      headerType === 'NONE'
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    None
                  </button>
                  <button
                    type='button'
                    onClick={() => setHeaderType('TEXT')}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded transition-colors',
                      headerType === 'TEXT'
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Text
                  </button>
                </div>
              </div>

              {headerType === 'TEXT' && (
                <div className='space-y-2 pt-1'>
                  <Input
                    placeholder='e.g. Order Status Update'
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value.slice(0, 60))}
                    className='h-8 text-xs'
                  />
                  <div className='flex justify-between text-[10px] text-muted-foreground'>
                    <span>Supports 1 variable like &#123;&#123;1&#125;&#125;</span>
                    <span>{headerText.length} / 60</span>
                  </div>
                  {headerText.includes('{{1}}') && (
                    <Input
                      placeholder='Sample value for {{1}} in header'
                      value={headerExample}
                      onChange={(e) => setHeaderExample(e.target.value)}
                      className='h-7 text-xs font-mono'
                    />
                  )}
                </div>
              )}
            </div>

            {/* Body Component */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='template-body' className='text-xs font-semibold'>
                  Body Text <span className='text-destructive'>*</span>
                </Label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleInsertVariable}
                  className='h-6 px-2 text-[11px] gap-1'
                >
                  <Icons.add className='size-3' />
                  Add Variable &#123;&#123;{detectedVariables.length + 1}&#125;&#125;
                </Button>
              </div>

              <Textarea
                id='template-body'
                rows={4}
                placeholder='Hi {{1}}, your order #{{2}} is on its way!'
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value.slice(0, 1024))}
                className='text-xs leading-relaxed font-sans'
                required
              />

              <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
                <span>Use *bold*, _italic_, ~strike~ for formatting.</span>
                <span>{bodyText.length} / 1024</span>
              </div>

              {/* Sample values for Meta review */}
              {detectedVariables.length > 0 && (
                <div className='rounded-lg border border-border/70 p-2.5 bg-muted/20 space-y-2'>
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-[11px] text-foreground'>
                      Sample Values (Required by Meta)
                    </span>
                    <span className='text-[10px] text-muted-foreground'>
                      Helps Meta approve your template
                    </span>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                    {detectedVariables.map((v, i) => (
                      <div key={v} className='flex items-center gap-1.5'>
                        <span className='font-mono font-bold text-[11px] text-primary shrink-0'>
                          {v}:
                        </span>
                        <Input
                          placeholder={`e.g. John`}
                          value={bodyExamples[i] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBodyExamples((prev) => {
                              const copy = [...prev];
                              copy[i] = val;
                              return copy;
                            });
                          }}
                          className='h-7 text-xs font-mono'
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Component */}
            <div className='space-y-1.5'>
              <div className='flex justify-between items-center'>
                <Label htmlFor='template-footer' className='text-xs font-semibold'>
                  Footer (Optional)
                </Label>
                <span className='text-[10px] text-muted-foreground'>{footerText.length} / 60</span>
              </div>
              <Input
                id='template-footer'
                placeholder='e.g. Reply STOP to unsubscribe'
                value={footerText}
                onChange={(e) => setFooterText(e.target.value.slice(0, 60))}
                className='h-8 text-xs'
              />
            </div>

            {/* Buttons Component */}
            <div className='rounded-lg border border-border/70 p-3 space-y-2.5 bg-muted/10'>
              <div className='flex items-center justify-between'>
                <div>
                  <Label className='text-xs font-semibold'>Action Buttons (Optional)</Label>
                  <p className='text-[10px] text-muted-foreground'>
                    Add Quick Reply or Website link buttons (max 3).
                  </p>
                </div>
                {buttons.length < 3 && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleAddButton}
                    className='h-6 px-2 text-[11px] gap-1'
                  >
                    <Icons.add className='size-3' />
                    Add Button
                  </Button>
                )}
              </div>

              {buttons.map((btn, index) => (
                <div
                  key={index}
                  className='rounded-md border border-border/60 p-2 space-y-2 bg-background'
                >
                  <div className='flex items-center gap-2'>
                    <select
                      value={btn.type}
                      onChange={(e) =>
                        handleButtonChange(index, {
                          type: e.target.value as 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER',
                        })
                      }
                      className='h-7 rounded border border-input bg-background px-2 text-[11px] font-medium'
                    >
                      <option value='QUICK_REPLY'>Quick Reply</option>
                      <option value='URL'>Website URL</option>
                      <option value='PHONE_NUMBER'>Phone Number</option>
                    </select>

                    <Input
                      placeholder='Button Label (max 25)'
                      value={btn.text}
                      onChange={(e) =>
                        handleButtonChange(index, { text: e.target.value.slice(0, 25) })
                      }
                      className='h-7 text-xs flex-1'
                      required
                    />

                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => handleRemoveButton(index)}
                      className='h-7 w-7 text-destructive hover:text-destructive'
                    >
                      <Icons.trash className='size-3.5' />
                    </Button>
                  </div>

                  {btn.type === 'URL' && (
                    <div className='space-y-1.5 pl-1'>
                      <Input
                        placeholder='https://yourwebsite.com/orders'
                        value={btn.url || ''}
                        onChange={(e) => handleButtonChange(index, { url: e.target.value })}
                        className='h-7 text-xs font-mono'
                        required
                      />
                    </div>
                  )}

                  {btn.type === 'PHONE_NUMBER' && (
                    <div className='space-y-1.5 pl-1'>
                      <Input
                        placeholder='+919876543210 (International format)'
                        value={btn.phone_number || ''}
                        onChange={(e) =>
                          handleButtonChange(index, { phone_number: e.target.value })
                        }
                        className='h-7 text-xs font-mono'
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Live WhatsApp Mobile Preview (5 cols) */}
          <div className='md:col-span-5 flex flex-col'>
            <div className='flex items-center justify-between pb-2'>
              <span className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                <span className='size-2 rounded-full bg-emerald-500' />
                Live WhatsApp Preview
              </span>
              {detectedVariables.length > 0 && (
                <button
                  type='button'
                  onClick={() => setShowPreviewSamples(!showPreviewSamples)}
                  className='text-[10px] text-primary hover:underline font-medium cursor-pointer'
                >
                  {showPreviewSamples ? 'Show Tags {{N}}' : 'Preview with Samples'}
                </button>
              )}
            </div>

            {/* Simulated Chat Background */}
            <div className='flex-1 rounded-xl bg-[#efeae2] dark:bg-[#0b141a] p-4 border border-border/40 flex flex-col justify-center min-h-[360px] relative overflow-hidden'>
              {/* WhatsApp Message Bubble */}
              <div className='relative max-w-[280px] sm:max-w-[320px] mx-auto w-full rounded-lg rounded-tl-none bg-white dark:bg-[#242626] text-[#111b21] dark:text-[#e9edef] p-3 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] space-y-2'>
                <svg
                  className='absolute -left-[8px] top-0 w-[9px] h-[13px] pointer-events-none text-white dark:text-[#242626]'
                  viewBox='0 0 8 13'
                  fill='currentColor'
                >
                  <path d='M1.533 3.568L8 12.19V0H2.883a2 2 0 0 0-1.35.532l-.001.001a1.996 1.996 0 0 0-.001 2.825l.002.001v.209z' />
                </svg>
                {/* Header preview */}
                {headerType === 'TEXT' && headerText && (
                  <div className='font-bold text-xs border-b border-border/15 pb-1 text-foreground'>
                    {headerText}
                  </div>
                )}

                {/* Body preview */}
                <div className='leading-relaxed text-xs'>{renderPreviewBody()}</div>

                {/* Footer preview */}
                {footerText && (
                  <div className='text-[10px] text-muted-foreground border-t border-border/15 pt-1'>
                    {footerText}
                  </div>
                )}

                {/* Timestamp & read ticks */}
                <div className='flex justify-end items-center gap-1 text-[9px] text-muted-foreground'>
                  <span>12:00 PM</span>
                  <Icons.checks className='size-3 text-muted-foreground' />
                </div>
              </div>

              {/* Action Buttons Below Bubble */}
              {buttons.length > 0 && (
                <div className='max-w-[280px] sm:max-w-[320px] mx-auto w-full mt-1.5 space-y-1'>
                  {buttons.map((btn, i) => (
                    <div
                      key={i}
                      className='w-full py-1.5 px-3 rounded-md bg-white dark:bg-[#242626] border border-black/5 dark:border-white/5 shadow-xs text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5'
                    >
                      {btn.type === 'URL' && <Icons.externalLink className='size-3' />}
                      {btn.type === 'PHONE_NUMBER' && <Icons.phone className='size-3' />}
                      {btn.type === 'QUICK_REPLY' && <Icons.reply className='size-3' />}
                      <span>{btn.text || `Button ${i + 1}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        <DialogFooter className='gap-2 sm:gap-0 mt-4 border-t border-border/40 pt-4'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            size='sm'
            className='text-xs'
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form={formId}
            disabled={isSubmitting}
            size='sm'
            className='text-xs'
          >
            {isSubmitting ? (
              <>
                <Icons.spinner className='mr-1.5 size-3.5 animate-spin' />
                Submitting to Meta...
              </>
            ) : (
              <>
                <Icons.send className='mr-1.5 size-3.5' />
                Submit to Meta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
