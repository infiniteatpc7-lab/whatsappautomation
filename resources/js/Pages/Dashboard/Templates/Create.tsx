import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { WhatsAppLockedState } from '@/components/whatsapp-locked-state';
import { IPhonePreview } from '@/features/templates/components/iphone-preview';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SharedProps } from '@/types';
import type { WhatsAppTemplate } from '@/features/templates/types';

type CreateTemplatePageProps = SharedProps & {
  hasConnectedAccount?: boolean;
  activeAccount?: {
    id: number;
    waba_id: string;
    phone_number_id: string;
    display_phone_number: string | null;
    verified_name: string | null;
  } | null;
  template?: WhatsAppTemplate | null;
};

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

interface CarouselCardDraft {
  header_format: 'IMAGE' | 'VIDEO';
  header_handle: string;
  mediaPreviewUrl: string;
  mediaName: string;
  isUploading: boolean;
  body_text: string;
  buttons: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    url_example?: string;
    phone_number?: string;
  }>;
}

function createEmptyCarouselCard(): CarouselCardDraft {
  return {
    header_format: 'IMAGE',
    header_handle: '',
    mediaPreviewUrl: '',
    mediaName: '',
    isUploading: false,
    body_text: '',
    buttons: [{ type: 'QUICK_REPLY', text: '' }],
  };
}

export default function CreateTemplatePage() {
  const { hasConnectedAccount, activeAccount, template } = usePage<CreateTemplatePageProps>().props;
  const isEdit = Boolean(template);
  const isApprovedEdit = isEdit && template?.status === 'APPROVED';
  const isEditableStatus =
    !isEdit ||
    Boolean(
      template?.meta_template_id &&
        ['APPROVED', 'REJECTED', 'PAUSED'].includes(template.status)
    );

  const initialHeader = template?.components?.find((c) => c.type === 'HEADER');
  const initialBody = template?.components?.find((c) => c.type === 'BODY');
  const initialFooter = template?.components?.find((c) => c.type === 'FOOTER');
  const initialButtons = template?.components?.find((c) => c.type === 'BUTTONS');

  const [name, setName] = useState(template?.name ?? '');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>(
    template?.category ?? 'MARKETING'
  );
  const [language, setLanguage] = useState(template?.language ?? 'en_US');

  const initialCarousel = template?.components?.find((c) => c.type === 'CAROUSEL');
  const [templateType, setTemplateType] = useState<'STANDARD' | 'CAROUSEL'>(
    initialCarousel ? 'CAROUSEL' : 'STANDARD'
  );

  // Header
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>(() => {
    if (initialHeader?.format === 'IMAGE' || initialHeader?.format === 'VIDEO' || initialHeader?.format === 'DOCUMENT') {
      return initialHeader.format;
    }
    if (initialHeader && (initialHeader.format === 'TEXT' || !initialHeader.format) && initialHeader.text) {
      return 'TEXT';
    }
    return 'NONE';
  });
  const [headerText, setHeaderText] = useState(initialHeader?.text ?? '');
  const [headerExample, setHeaderExample] = useState(initialHeader?.example?.header_text?.[0] ?? '');
  const [headerHandle, setHeaderHandle] = useState(initialHeader?.example?.header_handle?.[0] ?? '');
  const [headerMediaName, setHeaderMediaName] = useState('');
  const [headerMediaPreviewUrl, setHeaderMediaPreviewUrl] = useState('');
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);

  // Carousel Cards (2-10)
  const [carouselCards, setCarouselCards] = useState<CarouselCardDraft[]>(() => {
    if (initialCarousel?.cards && initialCarousel.cards.length >= 2) {
      return initialCarousel.cards.map((card) => {
        const cardHeader = card.components.find((c) => c.type === 'HEADER');
        const cardBody = card.components.find((c) => c.type === 'BODY');
        const cardButtons = card.components.find((c) => c.type === 'BUTTONS');
        return {
          header_format: cardHeader?.format === 'VIDEO' ? 'VIDEO' : 'IMAGE',
          header_handle: cardHeader?.example?.header_handle?.[0] ?? '',
          mediaPreviewUrl: '',
          mediaName: cardHeader?.example?.header_handle?.[0] ? 'Existing Meta sample' : '',
          isUploading: false,
          body_text: cardBody?.text ?? '',
          buttons:
            cardButtons?.buttons
              ?.filter((b) => b.type !== 'COPY_CODE')
              .map((b) => ({
                type: b.type as 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER',
                text: b.text,
                url: b.url,
                phone_number: b.phone_number,
              })) ?? [],
        };
      });
    }
    return [createEmptyCarouselCard(), createEmptyCarouselCard()];
  });

  const uploadSampleFile = async (file: File): Promise<{ header_handle: string; file_name: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/dashboard/templates/upload-sample', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-XSRF-TOKEN': getCsrfToken(),
      },
      credentials: 'same-origin',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.header_handle) {
      throw new Error(data.message || 'Failed to upload sample media to Meta.');
    }

    return {
      header_handle: data.header_handle,
      file_name: data.file_name || file.name,
    };
  };

  const handleHeaderMediaUpload = async (file: File) => {
    setIsUploadingHeader(true);
    try {
      const { header_handle, file_name } = await uploadSampleFile(file);
      setHeaderHandle(header_handle);
      setHeaderMediaName(file_name);
      if (headerType === 'IMAGE' || headerType === 'VIDEO') {
        setHeaderMediaPreviewUrl(URL.createObjectURL(file));
      } else {
        setHeaderMediaPreviewUrl('');
      }
      toast.success(`Uploaded ${file_name} to Meta.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload media sample.');
    } finally {
      setIsUploadingHeader(false);
    }
  };

  const handleCarouselCardUpload = async (cardIndex: number, file: File) => {
    setCarouselCards((prev) =>
      prev.map((c, i) => (i === cardIndex ? { ...c, isUploading: true } : c))
    );
    try {
      const { header_handle, file_name } = await uploadSampleFile(file);
      const previewUrl = URL.createObjectURL(file);
      setCarouselCards((prev) =>
        prev.map((c, i) =>
          i === cardIndex
            ? { ...c, header_handle, mediaName: file_name, mediaPreviewUrl: previewUrl, isUploading: false }
            : c
        )
      );
      toast.success(`Card ${cardIndex + 1} media uploaded to Meta.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to upload Card ${cardIndex + 1} media.`);
      setCarouselCards((prev) =>
        prev.map((c, i) => (i === cardIndex ? { ...c, isUploading: false } : c))
      );
    }
  };

  // Body
  const [bodyText, setBodyText] = useState(initialBody?.text ?? template?.body_text ?? '');
  const [bodyExamples, setBodyExamples] = useState<string[]>(
    initialBody?.example?.body_text?.[0] ?? []
  );

  // Footer
  const [footerText, setFooterText] = useState(initialFooter?.text ?? '');

  // Buttons
  const [buttons, setButtons] = useState<TemplateButtonForm[]>(
    (initialButtons?.buttons ?? [])
      .filter((b) => b.type === 'QUICK_REPLY' || b.type === 'URL' || b.type === 'PHONE_NUMBER')
      .map((b) => ({
        type: b.type as 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER',
        text: b.text,
        url: b.url,
        phone_number: b.phone_number,
      }))
  );

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreviewSamples, setShowPreviewSamples] = useState(true);

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

    // Meta Rule: Variables cannot be leading or trailing
    const trimmedBody = bodyText.trim();
    if (/^\{\{\d+\}\}/.test(trimmedBody)) {
      toast.error(
        'Meta rule: Variables cannot be at the very start of the message body. Add text before the variable (e.g., "Hello {{1}}").'
      );
      return;
    }

    if (/\{\{\d+\}\}[.,!?\s]*$/.test(trimmedBody)) {
      toast.error(
        'Meta rule: Variables cannot be at the very end of the message body. Please add closing words after the last variable (e.g. "projects in {{2}} today?").'
      );
      return;
    }

    if (templateType === 'STANDARD' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && !headerHandle) {
      toast.error('Please upload a sample file for the media header before submitting.');
      return;
    }

    if (templateType === 'CAROUSEL') {
      if (carouselCards.length < 2 || carouselCards.length > 10) {
        toast.error('Carousel templates must contain between 2 and 10 cards.');
        return;
      }
      for (let i = 0; i < carouselCards.length; i++) {
        const card = carouselCards[i];
        if (!card.header_handle) {
          toast.error(`Please upload a sample ${card.header_format.toLowerCase()} for Card ${i + 1}.`);
          return;
        }
        if (!card.body_text.trim()) {
          toast.error(`Please enter body text for Card ${i + 1}.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const endpoint = isEdit && template ? `/dashboard/templates/${template.id}` : '/dashboard/templates';
      const res = await fetch(endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...(isEdit ? {} : { name, language }),
          ...(!isApprovedEdit ? { category } : {}),
          template_type: templateType,
          header_type: templateType === 'CAROUSEL' ? 'NONE' : headerType,
          header_text: templateType === 'STANDARD' && headerType === 'TEXT' ? headerText : null,
          header_example:
            templateType === 'STANDARD' && headerType === 'TEXT' && headerText.includes('{{1}}')
              ? headerExample
              : null,
          header_handle:
            templateType === 'STANDARD' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)
              ? headerHandle
              : null,
          body_text: bodyText,
          body_examples: bodyExamples,
          footer_text: templateType === 'STANDARD' ? footerText || null : null,
          buttons: templateType === 'STANDARD' && buttons.length > 0 ? buttons : null,
          carousel_cards:
            templateType === 'CAROUSEL'
              ? carouselCards.map((c) => ({
                  header_format: c.header_format,
                  header_handle: c.header_handle,
                  body_text: c.body_text,
                  buttons: c.buttons,
                }))
              : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || `Failed to ${isEdit ? 'update' : 'create'} template on Meta.`);
        return;
      }

      toast.success(
        data.message ||
          (isEdit ? 'Template updated and resubmitted to Meta!' : 'Template submitted to Meta successfully!')
      );
      router.visit('/dashboard/templates');
    } catch {
      toast.error('Network error while communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live WhatsApp preview text with either {{1}} or sample replacement
  const renderPreviewBody = () => {
    if (!bodyText.trim()) {
      return (
        <span className='text-muted-foreground/60 italic text-xs leading-relaxed'>
          Type your message in the editor on the left to see live preview...
        </span>
      );
    }

    const parts = bodyText.split(/(\{\{\d+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/^\{\{(\d+)\}\}$/);
      if (match) {
        const varIndex = parseInt(match[1], 10) - 1;
        const enteredSample = bodyExamples[varIndex]?.trim();
        if (showPreviewSamples && enteredSample) {
          return (
            <span
              key={i}
              className='text-[#008069] dark:text-[#25D366] font-semibold'
            >
              {enteredSample}
            </span>
          );
        }
        return (
          <span
            key={i}
            className='inline-block rounded bg-[#008069]/15 dark:bg-[#25D366]/20 text-[#008069] dark:text-[#25D366] font-mono text-xs px-1.5 py-0.5 mx-0.5 font-bold border border-[#008069]/20 dark:border-[#25D366]/30'
          >
            {part}
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

  return (
    <PageContainer
      pageTitle={isEdit ? `Edit Template: ${template?.name}` : 'Create WhatsApp Template'}
      pageDescription={
        isEdit
          ? 'Update template components under Meta policy. Name and language are locked; saving resubmits for Meta review.'
          : 'Design, configure variables, and submit an approved Meta message template for customer re-engagement and broadcasts.'
      }
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          <Link
            href='/dashboard/templates'
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs md:text-sm')}
          >
            <Icons.chevronLeft className='mr-1.5 size-3.5' />
            Back to Templates
          </Link>
        </div>
      }
    >
      {!hasConnectedAccount ? (
        <WhatsAppLockedState
          featureName='WhatsApp Message Templates'
          description='Connect your Meta WhatsApp Cloud API credentials in Workspace settings before creating message templates.'
        />
      ) : (
        <form onSubmit={handleSubmit} className='space-y-6'>
          {activeAccount && (
            <div className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/60 p-3 text-xs text-muted-foreground backdrop-blur-sm'>
              <div className='flex items-center gap-2'>
                <Icons.badgeCheck className='size-4 text-emerald-500' />
                <span>
                  Connected WABA:{' '}
                  <span className='font-mono font-medium text-foreground'>
                    {activeAccount.waba_id}
                  </span>
                </span>
                {activeAccount.verified_name && (
                  <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground'>
                    {activeAccount.verified_name}
                  </span>
                )}
              </div>
              <Badge variant='outline' className='text-[10px] font-mono'>
                Meta Cloud API v22.0
              </Badge>
            </div>
          )}

          {isEdit && template && (
            <div
              className={cn(
                'rounded-xl p-3 text-xs flex items-start gap-2.5',
                isEditableStatus
                  ? 'bg-sky-500/5 text-sky-600 dark:text-sky-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              )}
            >
              <Icons.info className='size-4 shrink-0 mt-0.5' />
              <div className='space-y-0.5'>
                <p className='font-semibold'>
                  Meta Edit Policy ({template.status})
                </p>
                {isEditableStatus ? (
                  <p className='text-[11px] opacity-90'>
                    Template <strong>name</strong> and <strong>language</strong> are locked.{' '}
                    {isApprovedEdit
                      ? 'Approved templates cannot change category and can be edited up to 1 time per 24 hours (10 times per 30 days).'
                      : 'Rejected or paused templates can be edited freely to fix compliance issues.'}{' '}
                    Submitting replaces all components and triggers Meta re-evaluation.
                  </p>
                ) : (
                  <p className='text-[11px]'>
                    Templates with status <strong>{template.status}</strong> (or without a Meta template ID) cannot be edited right now.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            {/* Left Column: Form Cards (7 cols on lg, 8 cols on xl) */}
            <div className='lg:col-span-7 xl:col-span-7 space-y-6'>
              {/* Card 1: Basic Information */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-base font-semibold'>Template Details</CardTitle>
                  <CardDescription className='text-xs'>
                    Specify the template identifier, category classification, and recipient language.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='template-name' className='text-xs font-semibold'>
                        Template Name <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        id='template-name'
                        placeholder='e.g. order_delivery_update'
                        value={name}
                        onChange={handleNameChange}
                        disabled={isEdit}
                        className='h-9 text-xs font-mono'
                        required
                      />
                      <p className='text-[11px] text-muted-foreground'>
                        {isEdit
                          ? 'Locked by Meta policy after creation.'
                          : 'Lowercase letters, numbers, and underscores only.'}
                      </p>
                    </div>

                    <div className='space-y-1.5'>
                      <Label htmlFor='template-category' className='text-xs font-semibold'>
                        Category <span className='text-destructive'>*</span>
                      </Label>
                      <select
                        id='template-category'
                        value={category}
                        onChange={(e) => {
                          const nextCat = e.target.value as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
                          setCategory(nextCat);
                          if (nextCat !== 'MARKETING') {
                            setTemplateType('STANDARD');
                          }
                        }}
                        disabled={isApprovedEdit}
                        className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        <option value='MARKETING'>MARKETING (Promotions, sales, discounts)</option>
                        <option value='UTILITY'>UTILITY (Transactional orders, alerts, accounts)</option>
                        {category === 'AUTHENTICATION' && (
                          <option value='AUTHENTICATION'>AUTHENTICATION</option>
                        )}
                      </select>
                      <p className='text-[11px] text-muted-foreground'>
                        {isApprovedEdit
                          ? 'Category cannot be changed on approved templates.'
                          : 'Utility messages must contain zero promotional copy.'}
                      </p>
                    </div>
                  </div>

                  {category === 'MARKETING' && (
                    <div className='flex items-center justify-between rounded-lg border border-border/70 p-3 bg-muted/10'>
                      <div>
                        <Label className='text-xs font-semibold'>Template Format</Label>
                        <p className='text-[11px] text-muted-foreground'>
                          Choose Standard message or scrollable multi-card Carousel (2–10 cards).
                        </p>
                      </div>
                      <div className='flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border/60'>
                        <button
                          type='button'
                          onClick={() => setTemplateType('STANDARD')}
                          className={cn(
                            'text-xs px-3 py-1 rounded-md transition-colors',
                            templateType === 'STANDARD'
                              ? 'bg-background text-foreground font-semibold shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          Standard
                        </button>
                        <button
                          type='button'
                          onClick={() => setTemplateType('CAROUSEL')}
                          className={cn(
                            'text-xs px-3 py-1 rounded-md transition-colors',
                            templateType === 'CAROUSEL'
                              ? 'bg-background text-foreground font-semibold shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          Carousel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className='space-y-1.5'>
                    <Label htmlFor='template-language' className='text-xs font-semibold'>
                      Language <span className='text-destructive'>*</span>
                    </Label>
                    <select
                      id='template-language'
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      disabled={isEdit}
                      className='flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label} ({lang.code})
                        </option>
                      ))}
                      {isEdit && !SUPPORTED_LANGUAGES.some((l) => l.code === language) && (
                        <option value={language}>{language}</option>
                      )}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Template Structure */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-base font-semibold'>Template Content</CardTitle>
                  <CardDescription className='text-xs'>
                    Draft the header, body message with dynamic parameters, footer, and interactive buttons.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-5'>
                  {/* Header Component (Standard templates only) */}
                  {templateType === 'STANDARD' && (
                  <div className='rounded-lg border border-border/70 p-4 space-y-3 bg-muted/10'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div>
                        <Label className='text-xs font-semibold'>Header (Optional)</Label>
                        <p className='text-[11px] text-muted-foreground'>
                          Add a text title or media (Image, Video, PDF) at the top of your message.
                        </p>
                      </div>
                      <div className='flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border/60'>
                        {(
                          [
                            { id: 'NONE', label: 'None' },
                            { id: 'TEXT', label: 'Text' },
                            { id: 'IMAGE', label: 'Image' },
                            { id: 'VIDEO', label: 'Video' },
                            { id: 'DOCUMENT', label: 'PDF' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type='button'
                            onClick={() => {
                              setHeaderType(opt.id);
                              if (opt.id !== headerType) {
                                setHeaderHandle('');
                                setHeaderMediaName('');
                                setHeaderMediaPreviewUrl('');
                              }
                            }}
                            className={cn(
                              'text-xs px-2.5 py-1 rounded-md transition-colors',
                              headerType === opt.id
                                ? 'bg-background text-foreground font-semibold shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {headerType === 'TEXT' && (
                      <div className='space-y-2 pt-1'>
                        <Input
                          placeholder='e.g. Order Confirmation'
                          value={headerText}
                          onChange={(e) => setHeaderText(e.target.value.slice(0, 60))}
                          className='h-9 text-xs'
                        />
                        <div className='flex justify-between text-[11px] text-muted-foreground'>
                          <span>Supports 1 variable like &#123;&#123;1&#125;&#125;</span>
                          <span>{headerText.length} / 60</span>
                        </div>
                        {headerText.includes('{{1}}') && (
                          <Input
                            placeholder='Sample value for {{1}} in header'
                            value={headerExample}
                            onChange={(e) => setHeaderExample(e.target.value)}
                            className='h-8 text-xs font-mono'
                          />
                        )}
                      </div>
                    )}

                    {(['IMAGE', 'VIDEO', 'DOCUMENT'] as const).includes(
                      headerType as 'IMAGE' | 'VIDEO' | 'DOCUMENT'
                    ) && (
                      <div className='pt-1'>
                        <label className='flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors bg-background/60'>
                          <input
                            type='file'
                            className='hidden'
                            accept={
                              headerType === 'IMAGE'
                                ? 'image/jpeg,image/png'
                                : headerType === 'VIDEO'
                                ? 'video/mp4'
                                : 'application/pdf'
                            }
                            disabled={isUploadingHeader}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleHeaderMediaUpload(file);
                              e.target.value = '';
                            }}
                          />
                          {isUploadingHeader ? (
                            <div className='flex items-center gap-2 text-xs text-muted-foreground py-2'>
                              <Icons.spinner className='size-4 animate-spin text-primary' />
                              <span>Uploading sample to Meta...</span>
                            </div>
                          ) : headerHandle ? (
                            <div className='flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 py-1'>
                              <Icons.circleCheck className='size-4 shrink-0' />
                              <span className='font-medium truncate max-w-[260px]'>
                                {headerMediaName || 'Sample uploaded to Meta'}
                              </span>
                              <span className='text-[11px] text-muted-foreground underline ml-1'>
                                Replace
                              </span>
                            </div>
                          ) : (
                            <div className='space-y-1 py-1'>
                              <Icons.upload className='size-5 mx-auto text-muted-foreground' />
                              <p className='text-xs font-medium'>
                                Click to upload sample{' '}
                                {headerType === 'IMAGE'
                                  ? 'Image (JPG/PNG)'
                                  : headerType === 'VIDEO'
                                  ? 'Video (MP4)'
                                  : 'PDF Document'}
                              </p>
                              <p className='text-[10px] text-muted-foreground'>
                                Required by Meta for template review (max 16 MB).
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Body Component */}
                  <div className='space-y-2.5'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <Label htmlFor='template-body' className='text-xs font-semibold'>
                          Body Message <span className='text-destructive'>*</span>
                        </Label>
                        <p className='text-[11px] text-muted-foreground'>
                          Main message text. Supports variables &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125; and markdown.
                        </p>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={handleInsertVariable}
                        className='h-7 px-2.5 text-xs gap-1.5'
                      >
                        <Icons.add className='size-3.5' />
                        Add Variable &#123;&#123;{detectedVariables.length + 1}&#125;&#125;
                      </Button>
                    </div>

                    <Textarea
                      id='template-body'
                      rows={5}
                      placeholder='Hi {{1}}, your order #{{2}} is on its way! Track delivery below.'
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value.slice(0, 1024))}
                      className='text-xs sm:text-sm leading-relaxed font-sans'
                      required
                    />

                    <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
                      <span>Formatting: *bold*, _italic_, ~strike~, ```monospace```</span>
                      <span>{bodyText.length} / 1024</span>
                    </div>

                    {/* Sample values for Meta review */}
                    {detectedVariables.length > 0 && (
                      <div className='rounded-lg border border-border/70 p-3 bg-muted/20 space-y-2.5 mt-2'>
                        <div className='flex items-center justify-between'>
                          <span className='font-semibold text-xs text-foreground'>
                            Variable Sample Content (Required by Meta)
                          </span>
                          <span className='text-[11px] text-muted-foreground'>
                            Meta uses these dummy values for template approval
                          </span>
                        </div>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                          {detectedVariables.map((v, i) => (
                            <div key={v} className='flex items-center gap-2'>
                              <span className='font-mono font-bold text-xs text-primary shrink-0 w-12'>
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
                                className='h-8 text-xs font-mono'
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {templateType === 'STANDARD' && (
                    <>
                      {/* Footer Component */}
                      <div className='space-y-1.5'>
                        <div className='flex justify-between items-center'>
                          <div>
                            <Label htmlFor='template-footer' className='text-xs font-semibold'>
                              Footer (Optional)
                            </Label>
                            <p className='text-[11px] text-muted-foreground'>
                              Short disclaimer, company tagline, or unsubscribe notice.
                            </p>
                          </div>
                          <span className='text-[11px] text-muted-foreground'>{footerText.length} / 60</span>
                        </div>
                        <Input
                          id='template-footer'
                          placeholder='e.g. Reply STOP to opt out'
                          value={footerText}
                          onChange={(e) => setFooterText(e.target.value.slice(0, 60))}
                          className='h-9 text-xs'
                        />
                      </div>

                      {/* Buttons Component */}
                      <div className='rounded-lg border border-border/70 p-4 space-y-3 bg-muted/10'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <Label className='text-xs font-semibold'>Interactive Buttons (Optional)</Label>
                            <p className='text-[11px] text-muted-foreground'>
                              Add Quick Reply or Website link buttons (up to 3 buttons).
                            </p>
                          </div>
                          {buttons.length < 3 && (
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              onClick={handleAddButton}
                              className='h-7 px-2.5 text-xs gap-1.5'
                            >
                              <Icons.add className='size-3.5' />
                              Add Button
                            </Button>
                          )}
                        </div>

                        {buttons.map((btn, index) => (
                          <div
                            key={index}
                            className='rounded-md border border-border/60 p-3 space-y-2.5 bg-background shadow-xs'
                          >
                            <div className='flex items-center gap-2'>
                              <select
                                value={btn.type}
                                onChange={(e) =>
                                  handleButtonChange(index, {
                                    type: e.target.value as 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER',
                                  })
                                }
                                className='h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium'
                              >
                                <option value='QUICK_REPLY'>Quick Reply</option>
                                <option value='URL'>Website URL</option>
                                <option value='PHONE_NUMBER'>Phone Number</option>
                              </select>

                              <Input
                                placeholder='Button Label (max 25 chars)'
                                value={btn.text}
                                onChange={(e) =>
                                  handleButtonChange(index, { text: e.target.value.slice(0, 25) })
                                }
                                className='h-8 text-xs flex-1'
                                required
                              />

                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                onClick={() => handleRemoveButton(index)}
                                className='h-8 w-8 text-destructive hover:text-destructive'
                              >
                                <Icons.trash className='size-4' />
                              </Button>
                            </div>

                            {btn.type === 'URL' && (
                              <div className='space-y-1.5'>
                                <Input
                                  placeholder='https://yourwebsite.com/orders'
                                  value={btn.url || ''}
                                  onChange={(e) => handleButtonChange(index, { url: e.target.value })}
                                  className='h-8 text-xs font-mono'
                                  required
                                />
                                <p className='text-[10px] text-muted-foreground'>
                                  Must include full URL with https://
                                </p>
                              </div>
                            )}

                            {btn.type === 'PHONE_NUMBER' && (
                              <div className='space-y-1.5'>
                                <Input
                                  placeholder='+919876543210 (International format with country code)'
                                  value={btn.phone_number || ''}
                                  onChange={(e) =>
                                    handleButtonChange(index, { phone_number: e.target.value })
                                  }
                                  className='h-8 text-xs font-mono'
                                  required
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {templateType === 'CAROUSEL' && (
                    <div className='rounded-lg border border-border/70 p-4 space-y-4 bg-muted/10'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <Label className='text-xs font-semibold'>
                            Carousel Cards ({carouselCards.length} / 10)
                          </Label>
                          <p className='text-[11px] text-muted-foreground'>
                            Add 2 to 10 scrollable cards. Each card has an Image or Video, body copy, and up to 2 buttons.
                          </p>
                        </div>
                        {carouselCards.length < 10 && (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              setCarouselCards((prev) => [...prev, createEmptyCarouselCard()])
                            }
                            className='h-7 px-2.5 text-xs gap-1.5'
                          >
                            <Icons.add className='size-3.5' />
                            Add Card
                          </Button>
                        )}
                      </div>

                      {carouselCards.map((card, cardIdx) => (
                        <div
                          key={cardIdx}
                          className='rounded-md border border-border/60 p-3.5 space-y-3 bg-background shadow-xs'
                        >
                          <div className='flex items-center justify-between'>
                            <span className='text-xs font-semibold'>Card #{cardIdx + 1}</span>
                            <div className='flex items-center gap-2'>
                              <div className='flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border/60'>
                                {(['IMAGE', 'VIDEO'] as const).map((fmt) => (
                                  <button
                                    key={fmt}
                                    type='button'
                                    onClick={() =>
                                      setCarouselCards((prev) =>
                                        prev.map((c, i) =>
                                          i === cardIdx
                                            ? {
                                                ...c,
                                                header_format: fmt,
                                                header_handle: '',
                                                mediaName: '',
                                                mediaPreviewUrl: '',
                                              }
                                            : c
                                        )
                                      )
                                    }
                                    className={cn(
                                      'text-[11px] px-2.5 py-0.5 rounded-md transition-colors',
                                      card.header_format === fmt
                                        ? 'bg-background text-foreground font-semibold shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                    )}
                                  >
                                    {fmt === 'IMAGE' ? 'Image' : 'Video'}
                                  </button>
                                ))}
                              </div>
                              {carouselCards.length > 2 && (
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  onClick={() =>
                                    setCarouselCards((prev) => prev.filter((_, i) => i !== cardIdx))
                                  }
                                  className='h-7 w-7 text-destructive hover:text-destructive'
                                >
                                  <Icons.trash className='size-3.5' />
                                </Button>
                              )}
                            </div>
                          </div>

                          <label className='flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/10'>
                            <input
                              type='file'
                              className='hidden'
                              accept={
                                card.header_format === 'IMAGE' ? 'image/jpeg,image/png' : 'video/mp4'
                              }
                              disabled={card.isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCarouselCardUpload(cardIdx, file);
                                e.target.value = '';
                              }}
                            />
                            {card.isUploading ? (
                              <div className='flex items-center gap-2 text-xs text-muted-foreground py-1'>
                                <Icons.spinner className='size-3.5 animate-spin text-primary' />
                                <span>Uploading to Meta...</span>
                              </div>
                            ) : card.header_handle ? (
                              <div className='flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400'>
                                <Icons.circleCheck className='size-4 shrink-0' />
                                <span className='font-medium truncate max-w-[220px]'>
                                  {card.mediaName || 'Uploaded'}
                                </span>
                                <span className='text-[11px] text-muted-foreground underline'>
                                  Replace
                                </span>
                              </div>
                            ) : (
                              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                <Icons.upload className='size-4' />
                                <span>
                                  Upload Card {cardIdx + 1}{' '}
                                  {card.header_format === 'IMAGE' ? 'Image (JPG/PNG)' : 'Video (MP4)'}
                                </span>
                              </div>
                            )}
                          </label>

                          <div className='space-y-1'>
                            <div className='flex justify-between items-center'>
                              <Label className='text-[11px] font-medium'>Card Body Text</Label>
                              <span className='text-[10px] text-muted-foreground'>
                                {card.body_text.length} / 160
                              </span>
                            </div>
                            <Input
                              placeholder={`Describe Card ${cardIdx + 1}...`}
                              value={card.body_text}
                              onChange={(e) =>
                                setCarouselCards((prev) =>
                                  prev.map((c, i) =>
                                    i === cardIdx
                                      ? { ...c, body_text: e.target.value.slice(0, 160) }
                                      : c
                                  )
                                )
                              }
                              className='h-8 text-xs'
                              required
                            />
                          </div>

                          <div className='space-y-2'>
                            <div className='flex items-center justify-between'>
                              <Label className='text-[11px] font-medium'>
                                Card Buttons ({card.buttons.length} / 2)
                              </Label>
                              {card.buttons.length < 2 && (
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() =>
                                    setCarouselCards((prev) =>
                                      prev.map((c, i) =>
                                        i === cardIdx
                                          ? {
                                              ...c,
                                              buttons: [
                                                ...c.buttons,
                                                { type: 'QUICK_REPLY', text: '' },
                                              ],
                                            }
                                          : c
                                      )
                                    )
                                  }
                                  className='h-6 px-2 text-[11px] gap-1'
                                >
                                  <Icons.add className='size-3' />
                                  Add Button
                                </Button>
                              )}
                            </div>

                            {card.buttons.map((cBtn, bi) => (
                              <div key={bi} className='space-y-1.5 rounded border border-border/50 p-2 bg-muted/10'>
                                <div className='flex items-center gap-2'>
                                  <select
                                    value={cBtn.type}
                                    onChange={(e) =>
                                      setCarouselCards((prev) =>
                                        prev.map((c, i) =>
                                          i === cardIdx
                                            ? {
                                                ...c,
                                                buttons: c.buttons.map((b, bIdx) =>
                                                  bIdx === bi
                                                    ? {
                                                        ...b,
                                                        type: e.target.value as
                                                          | 'QUICK_REPLY'
                                                          | 'URL'
                                                          | 'PHONE_NUMBER',
                                                      }
                                                    : b
                                                ),
                                              }
                                            : c
                                        )
                                      )
                                    }
                                    className='h-7 rounded-md border border-input bg-background px-2 text-[11px]'
                                  >
                                    <option value='QUICK_REPLY'>Quick Reply</option>
                                    <option value='URL'>Website URL</option>
                                    <option value='PHONE_NUMBER'>Phone</option>
                                  </select>
                                  <Input
                                    placeholder='Button Label (max 25)'
                                    value={cBtn.text}
                                    onChange={(e) =>
                                      setCarouselCards((prev) =>
                                        prev.map((c, i) =>
                                          i === cardIdx
                                            ? {
                                                ...c,
                                                buttons: c.buttons.map((b, bIdx) =>
                                                  bIdx === bi
                                                    ? { ...b, text: e.target.value.slice(0, 25) }
                                                    : b
                                                ),
                                              }
                                            : c
                                        )
                                      )
                                    }
                                    className='h-7 text-xs flex-1'
                                    required
                                  />
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    onClick={() =>
                                      setCarouselCards((prev) =>
                                        prev.map((c, i) =>
                                          i === cardIdx
                                            ? {
                                                ...c,
                                                buttons: c.buttons.filter((_, bIdx) => bIdx !== bi),
                                              }
                                            : c
                                        )
                                      )
                                    }
                                    className='h-7 w-7 text-destructive hover:text-destructive'
                                  >
                                    <Icons.trash className='size-3.5' />
                                  </Button>
                                </div>
                                {cBtn.type === 'URL' && (
                                  <Input
                                    placeholder='https://yourwebsite.com/product'
                                    value={cBtn.url || ''}
                                    onChange={(e) =>
                                      setCarouselCards((prev) =>
                                        prev.map((c, i) =>
                                          i === cardIdx
                                            ? {
                                                ...c,
                                                buttons: c.buttons.map((b, bIdx) =>
                                                  bIdx === bi ? { ...b, url: e.target.value } : b
                                                ),
                                              }
                                            : c
                                        )
                                      )
                                    }
                                    className='h-7 text-xs font-mono'
                                    required
                                  />
                                )}
                                {cBtn.type === 'PHONE_NUMBER' && (
                                  <Input
                                    placeholder='+919876543210'
                                    value={cBtn.phone_number || ''}
                                    onChange={(e) =>
                                      setCarouselCards((prev) =>
                                        prev.map((c, i) =>
                                          i === cardIdx
                                            ? {
                                                ...c,
                                                buttons: c.buttons.map((b, bIdx) =>
                                                  bIdx === bi
                                                    ? { ...b, phone_number: e.target.value }
                                                    : b
                                                ),
                                              }
                                            : c
                                        )
                                      )
                                    }
                                    className='h-7 text-xs font-mono'
                                    required
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Form Action Controls */}
              <div className='flex items-center justify-end gap-3 pt-2'>
                <Link
                  href='/dashboard/templates'
                  className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'text-xs md:text-sm')}
                >
                  Cancel
                </Link>
                <Button
                  type='submit'
                  disabled={isSubmitting || !isEditableStatus}
                  size='default'
                  className='text-xs md:text-sm font-semibold gap-2 px-5'
                >
                  {isSubmitting ? (
                    <>
                      <Icons.spinner className='size-4 animate-spin' />
                      {isEdit ? 'Updating on Meta...' : 'Submitting to Meta...'}
                    </>
                  ) : (
                    <>
                      <Icons.send className='size-4' />
                      {isEdit ? 'Save & Resubmit to Meta' : 'Submit to Meta'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Column: Sticky Live WhatsApp Phone Mockup (5 cols on lg, 4 cols on xl) */}
            <div className='lg:col-span-5 xl:col-span-5'>
              <div className='sticky top-6 space-y-4'>
                {detectedVariables.length > 0 && (
                  <div className='flex items-center justify-end max-w-[340px] sm:max-w-[365px] mx-auto w-full px-1'>
                    <button
                      type='button'
                      onClick={() => setShowPreviewSamples(!showPreviewSamples)}
                      className='text-xs text-primary hover:underline font-medium cursor-pointer'
                    >
                      {showPreviewSamples ? 'Show Variable Tags' : 'Preview with Samples'}
                    </button>
                  </div>
                )}

                {/* iPhone 17 Screen Mockup */}
                <IPhonePreview
                  verifiedName={activeAccount?.verified_name}
                  headerType={templateType === 'CAROUSEL' ? 'NONE' : headerType}
                  headerText={headerText}
                  headerMediaUrl={headerMediaPreviewUrl}
                  headerMediaName={headerMediaName}
                  bodyContent={renderPreviewBody()}
                  footerText={templateType === 'CAROUSEL' ? undefined : footerText}
                  buttons={templateType === 'CAROUSEL' ? [] : buttons}
                  carouselCards={
                    templateType === 'CAROUSEL'
                      ? carouselCards.map((c) => ({
                          headerFormat: c.header_format,
                          mediaPreviewUrl: c.mediaPreviewUrl,
                          bodyText: c.body_text,
                          buttons: c.buttons,
                        }))
                      : undefined
                  }
                />

                {/* Meta Compliance Quick Guide Card */}
                <Card className='bg-muted/30 border-border/60'>
                  <CardHeader className='p-3.5 pb-2'>
                    <CardTitle className='text-xs font-semibold flex items-center gap-1.5'>
                      <Icons.info className='size-3.5 text-primary' />
                      Meta Template Review Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='p-3.5 pt-0 text-[11px] text-muted-foreground space-y-1.5 leading-relaxed'>
                    <p>• Sequential variables: always start at &#123;&#123;1&#125;&#125; without skipping numbers.</p>
                    <p>• Variables cannot be at the very start or end of the message (add text before and after variables).</p>
                    <p>• Zero marketing wording for Utility templates to prevent automated rejections.</p>
                    <p>• Sample values are submitted automatically to help Meta reviewers approve faster.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </form>
      )}
    </PageContainer>
  );
}
