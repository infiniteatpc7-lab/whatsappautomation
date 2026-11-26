export type OptInStatus = 'opted_in' | 'opted_out' | 'unknown';

export interface TagItem {
  id: string;
  name: string;
  color?: string | null;
}

export interface ContactItem {
  id: string;
  wa_id: string;
  name: string | null;
  profile_name: string | null;
  email: string | null;
  company_name: string | null;
  city: string | null;
  state: string | null;
  source: string;
  opt_in_status: OptInStatus;
  tags: TagItem[];
  created_at: string | null;
}
