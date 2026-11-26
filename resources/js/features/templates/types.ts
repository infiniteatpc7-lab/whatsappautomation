export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export type TemplateStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'IN_APPEAL'
  | 'PAUSED'
  | 'DISABLED'
  | 'DRAFT';

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS' | 'CAROUSEL';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  example?: {
    header_handle?: string[];
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
  cards?: Array<{
    components: TemplateComponent[];
  }>;
}

export interface WhatsAppTemplate {
  id: string;
  meta_template_id: string | null;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  header_type: string | null;
  body_text: string;
  components: TemplateComponent[];
  rejected_reason: string | null;
  last_synced_at: string;
}
