export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'processing'
  | 'completed'
  | 'paused'
  | 'cancelled'
  | 'failed';

export type RecipientStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'skipped';

export interface BroadcastQuota {
  tier: string | null;
  daily_limit: number | null;
  sent_today: number;
  remaining: number | null;
}

export interface CampaignItem {
  id: string;
  name: string;
  status: CampaignStatus;
  template_name: string;
  template_language: string;
  creator_name: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  replied_count: number;
  clicks_count: number;
  smart_sender_enabled: boolean;
  retry_window_hours: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface CampaignRecipientItem {
  id: string;
  contact_name: string;
  wa_id: string;
  company_name: string | null;
  status: RecipientStatus;
  error_code: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
}
