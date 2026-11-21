# Complete MySQL 8 Database Schema Blueprint

This document defines the complete 16-table multi-tenant database schema for the WhatsApp Business API SaaS in Laravel 13 and MySQL 8.

All tables use `ENGINE=InnoDB`, `CHARACTER SET utf8mb4`, `COLLATE utf8mb4_0900_ai_ci` to guarantee full support for 4-byte emojis, Indic scripts (Hindi, Gujarati, Tamil, etc.), and case-insensitive unique constraints.

---

## 1. Table Manifest & Dependency Order

Migrations execute in this exact sequence:

1. `users` (standard Laravel auth + `current_workspace_id`, `phone`, `avatar_url`)
2. `workspaces` (tenant root container)
3. `workspace_user` (pivot table: users in workspaces with roles)
4. `whatsapp_accounts` (connected WABAs and phone numbers)
5. `contacts` (workspace customer database)
6. `tags` & `contact_tag` (tag taxonomy & pivot)
7. `templates` (cached Meta message templates)
8. `campaigns` (marketing & utility broadcasts)
9. `campaign_recipients` (individual broadcast dispatch logs)
10. `conversations` (chat threads with contacts)
11. `messages` (inbound & outbound WhatsApp messages)
12. `conversations` FK update (`last_message_id` constraint)
13. `conversation_notes` (internal team discussion notes)
14. `kanban_boards`, `kanban_columns`, `kanban_cards` (visual pipelines & automations)
15. `automation_flows` (trigger -> condition -> action workflows)
16. `ai_agents` & `ai_knowledge_sources` (AI bot configurations & RAG sources)
17. `webhook_logs` (raw Meta payload auditing)

---

## 2. Table Schemas & Column Specifications

### Table 1: `workspaces`
Root multi-tenant entity.
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `uuid`: CHAR(36) NOT NULL UNIQUE
- `name`: VARCHAR(255) NOT NULL
- `slug`: VARCHAR(255) NOT NULL UNIQUE
- `owner_id`: BIGINT UNSIGNED NOT NULL (FK -> `users.id` ON DELETE RESTRICT)
- `plan`: VARCHAR(50) NOT NULL DEFAULT 'free' (Cast: `WorkspacePlan` enum)
- `timezone`: VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata'
- `settings`: JSON NULL
- `created_at`, `updated_at`: TIMESTAMP NULL

### Table 2: `workspace_user` (Pivot)
Membership and role assignments.
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
- `user_id`: BIGINT UNSIGNED NOT NULL (FK -> `users.id` ON DELETE CASCADE)
- `role`: VARCHAR(50) NOT NULL DEFAULT 'agent' (Cast: `WorkspaceRole` enum: `owner`, `admin`, `agent`)
- `is_available`: BOOLEAN NOT NULL DEFAULT true
- `created_at`, `updated_at`: TIMESTAMP NULL
- **Indexes:** UNIQUE(`workspace_id`, `user_id`), INDEX(`user_id`, `role`)

### Table 3: `whatsapp_accounts`
WhatsApp Cloud API connection credentials.
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
- `connection_type`: VARCHAR(50) NOT NULL DEFAULT 'manual' (`WhatsAppConnectionType`: `manual`, `embedded_signup`)
- `waba_id`: VARCHAR(100) NOT NULL
- `phone_number_id`: VARCHAR(100) NOT NULL UNIQUE
- `display_phone_number`: VARCHAR(50) NOT NULL
- `verified_name`: VARCHAR(255) NULL
- `quality_rating`: VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN'
- `messaging_limit_tier`: VARCHAR(50) NOT NULL DEFAULT 'TIER_250'
- `access_token`: TEXT NOT NULL (Cast: `'encrypted'`, Hidden: `true`)
- `app_secret`: TEXT NULL (Cast: `'encrypted'`, Hidden: `true`)
- `webhook_verify_token`: VARCHAR(255) NOT NULL
- `status`: VARCHAR(50) NOT NULL DEFAULT 'pending' (`WhatsAppAccountStatus`: `pending`, `connected`, `disconnected`, `restricted`, `banned`)
- `created_at`, `updated_at`: TIMESTAMP NULL
- **Indexes:** INDEX(`workspace_id`, `status`), INDEX(`waba_id`)

### Table 4: `contacts`
Customer CRM records with normalized WhatsApp IDs.
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
- `wa_id`: VARCHAR(30) NOT NULL (Normalized digits-only E.164, e.g., `919727509785`)
- `name`: VARCHAR(255) NULL
- `email`: VARCHAR(255) NULL
- `company_name`: VARCHAR(255) NULL
- `city`: VARCHAR(100) NULL
- `opt_in_status`: VARCHAR(50) NOT NULL DEFAULT 'opted_in' (`OptInStatus`: `opted_in`, `opted_out`, `pending`)
- `opt_in_at`: TIMESTAMP NULL
- `custom_attributes`: JSON NULL
- `created_at`, `updated_at`: TIMESTAMP NULL
- **Indexes:** UNIQUE(`workspace_id`, `wa_id`), INDEX(`workspace_id`, `opt_in_status`), INDEX(`workspace_id`, `city`)

### Table 5: `tags` & `contact_tag`
Tag taxonomy and pivot.
- `tags`:
  - `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  - `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
  - `name`: VARCHAR(100) NOT NULL
  - `color`: VARCHAR(20) NOT NULL DEFAULT '#10b981'
  - **Indexes:** UNIQUE(`workspace_id`, `name`)
- `contact_tag`:
  - `contact_id`: BIGINT UNSIGNED (FK -> `contacts.id` ON DELETE CASCADE)
  - `tag_id`: BIGINT UNSIGNED (FK -> `tags.id` ON DELETE CASCADE)
  - PRIMARY KEY(`contact_id`, `tag_id`)

### Table 6: `templates`
Meta-approved WhatsApp message templates.
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
- `whatsapp_account_id`: BIGINT UNSIGNED NOT NULL (FK -> `whatsapp_accounts.id` ON DELETE CASCADE)
- `meta_template_id`: VARCHAR(100) NULL
- `name`: VARCHAR(255) NOT NULL
- `language`: VARCHAR(20) NOT NULL DEFAULT 'en'
- `category`: VARCHAR(50) NOT NULL (`TemplateCategory`: `marketing`, `utility`, `authentication`)
- `status`: VARCHAR(50) NOT NULL DEFAULT 'PENDING' (`TemplateStatus`: `APPROVED`, `PENDING`, `REJECTED`, `PAUSED`, `DISABLED`)
- `components`: JSON NOT NULL (Header, Body, Footer, Buttons structure)
- `rejection_reason`: TEXT NULL
- `created_at`, `updated_at`: TIMESTAMP NULL
- **Indexes:** UNIQUE(`whatsapp_account_id`, `name`, `language`), INDEX(`workspace_id`, `status`), INDEX(`meta_template_id`)

### Table 7: `campaigns` & `campaign_recipients`
Broadcast campaigns and granular recipient tracking.
- `campaigns`:
  - `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  - `uuid`: CHAR(36) NOT NULL UNIQUE
  - `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
  - `whatsapp_account_id`: BIGINT UNSIGNED NOT NULL (FK -> `whatsapp_accounts.id` ON DELETE RESTRICT)
  - `template_id`: BIGINT UNSIGNED NOT NULL (FK -> `templates.id` ON DELETE RESTRICT)
  - `name`: VARCHAR(255) NOT NULL
  - `status`: VARCHAR(50) NOT NULL DEFAULT 'draft' (`CampaignStatus`: `draft`, `scheduled`, `processing`, `completed`, `paused`, `failed`)
  - `scheduled_at`: TIMESTAMP NULL
  - `total_recipients`: INT UNSIGNED NOT NULL DEFAULT 0
  - `sent_count`, `delivered_count`, `read_count`, `failed_count`: INT UNSIGNED NOT NULL DEFAULT 0
  - `created_at`, `updated_at`: TIMESTAMP NULL
  - **Indexes:** INDEX(`workspace_id`, `status`, `scheduled_at`), INDEX(`scheduled_at`)
- `campaign_recipients`:
  - `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  - `campaign_id`: BIGINT UNSIGNED NOT NULL (FK -> `campaigns.id` ON DELETE CASCADE)
  - `contact_id`: BIGINT UNSIGNED NOT NULL (FK -> `contacts.id` ON DELETE CASCADE)
  - `wamid`: VARCHAR(255) NULL
  - `status`: VARCHAR(50) NOT NULL DEFAULT 'queued' (`RecipientStatus`: `queued`, `sent`, `delivered`, `read`, `failed`, `skipped`)
  - `error_code`, `error_message`: VARCHAR(255) NULL
  - `sent_at`, `delivered_at`, `read_at`: TIMESTAMP NULL
  - **Indexes:** UNIQUE(`campaign_id`, `contact_id`), INDEX(`campaign_id`, `status`), INDEX(`wamid`)

### Table 8: `conversations`
Chat threads with contacts.
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `uuid`: CHAR(36) NOT NULL UNIQUE
- `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
- `whatsapp_account_id`: BIGINT UNSIGNED NOT NULL (FK -> `whatsapp_accounts.id` ON DELETE RESTRICT)
- `contact_id`: BIGINT UNSIGNED NOT NULL (FK -> `contacts.id` ON DELETE CASCADE)
- `assigned_to`: BIGINT UNSIGNED NULL (FK -> `users.id` ON DELETE SET NULL)
- `status`: VARCHAR(50) NOT NULL DEFAULT 'open' (`ConversationStatus`: `open`, `pending`, `resolved`, `expired`)
- `last_message_id`: BIGINT UNSIGNED NULL (FK added after `messages` table)
- `last_message_at`: TIMESTAMP NULL
- `last_inbound_at`: TIMESTAMP NULL
- `window_expires_at`: TIMESTAMP NULL (Customer care 24h window: `last_inbound_at + 24 hours`)
- `free_entry_expires_at`: TIMESTAMP NULL (72h or 7-day free conversation window from CTWA click-to-WhatsApp ads)
- `unread_count`: INT UNSIGNED NOT NULL DEFAULT 0
- `created_at`, `updated_at`: TIMESTAMP NULL
- **Indexes:** UNIQUE(`whatsapp_account_id`, `contact_id`), INDEX(`workspace_id`, `status`, `last_message_at`), INDEX(`workspace_id`, `assigned_to`, `status`)

### Table 9: `messages`
Individual WhatsApp messages.
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
- `conversation_id`: BIGINT UNSIGNED NOT NULL (FK -> `conversations.id` ON DELETE CASCADE)
- `whatsapp_account_id`: BIGINT UNSIGNED NOT NULL (FK -> `whatsapp_accounts.id` ON DELETE RESTRICT)
- `wamid`: VARCHAR(255) NULL (Unique Meta Message ID: `wamid.HBg...`)
- `direction`: VARCHAR(50) NOT NULL (`MessageDirection`: `inbound`, `outbound`)
- `sender_type`: VARCHAR(50) NOT NULL (`MessageSenderType`: `contact`, `agent`, `bot`, `campaign`)
- `sent_by_user_id`: BIGINT UNSIGNED NULL (FK -> `users.id` ON DELETE SET NULL)
- `campaign_id`: BIGINT UNSIGNED NULL (FK -> `campaigns.id` ON DELETE SET NULL)
- `type`: VARCHAR(50) NOT NULL DEFAULT 'text' (`MessageType`: `text`, `image`, `video`, `audio`, `document`, `location`, `contacts`, `interactive`, `template`, `reaction`)
- `body`: TEXT NULL
- `media_meta_id`: VARCHAR(255) NULL
- `media_path`: VARCHAR(1000) NULL (Permanent stored file path on S3/local disk)
- `media_mime_type`: VARCHAR(100) NULL
- `payload`: JSON NULL (Raw Meta webhook payload / interactive reply object)
- `context_wamid`: VARCHAR(255) NULL (Reply-to context message ID)
- `status`: VARCHAR(50) NOT NULL DEFAULT 'queued' (`MessageStatus`: `queued`, `sent`, `delivered`, `read`, `failed`)
- `status_rank`: TINYINT UNSIGNED NOT NULL DEFAULT 0 (Guard: `0=queued, 1=sent, 2=delivered, 3=read, 9=failed`)
- `pricing_category`: VARCHAR(50) NULL (`marketing`, `utility`, `authentication`, `service`, `meta_business_agent`, `free`)
- `is_billable`: BOOLEAN NOT NULL DEFAULT false
- `error_code`, `error_message`: TEXT NULL
- `sent_at`, `delivered_at`, `read_at`, `failed_at`: TIMESTAMP NULL
- `created_at`, `updated_at`: TIMESTAMP NULL
- **Indexes:** UNIQUE(`wamid`), INDEX(`conversation_id`, `id`), INDEX(`workspace_id`, `created_at`), INDEX(`workspace_id`, `pricing_category`, `is_billable`, `created_at`, name: `'msg_ws_pricing_billable_created_idx'`), INDEX(`context_wamid`)

### Table 10: `conversation_notes`
Internal agent-to-agent collaboration notes.
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
- `conversation_id`: BIGINT UNSIGNED NOT NULL (FK -> `conversations.id` ON DELETE CASCADE)
- `user_id`: BIGINT UNSIGNED NOT NULL (FK -> `users.id` ON DELETE CASCADE)
- `content`: TEXT NOT NULL
- `created_at`, `updated_at`: TIMESTAMP NULL
- **Indexes:** INDEX(`conversation_id`, `created_at`)

### Table 11, 12, 13: `kanban_boards`, `kanban_columns`, `kanban_cards`
Deal pipeline, operational stages, and column-drop WhatsApp automations.
- `kanban_boards`:
  - `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  - `uuid`: CHAR(36) NOT NULL UNIQUE
  - `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
  - `name`: VARCHAR(255) NOT NULL
  - `is_default`: BOOLEAN NOT NULL DEFAULT false
  - `created_at`, `updated_at`: TIMESTAMP NULL
  - **Indexes:** INDEX(`workspace_id`, `is_default`)
- `kanban_columns`:
  - `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  - `board_id`: BIGINT UNSIGNED NOT NULL (FK -> `kanban_boards.id` ON DELETE CASCADE)
  - `title`: VARCHAR(255) NOT NULL
  - `position`: INT UNSIGNED NOT NULL DEFAULT 0
  - `auto_template_id`: BIGINT UNSIGNED NULL (FK -> `templates.id` ON DELETE SET NULL)
  - `created_at`, `updated_at`: TIMESTAMP NULL
  - **Indexes:** INDEX(`board_id`, `position`)
- `kanban_cards`:
  - `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  - `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
  - `board_id`: BIGINT UNSIGNED NOT NULL (FK -> `kanban_boards.id` ON DELETE CASCADE)
  - `column_id`: BIGINT UNSIGNED NOT NULL (FK -> `kanban_columns.id` ON DELETE CASCADE)
  - `contact_id`: BIGINT UNSIGNED NULL (FK -> `contacts.id` ON DELETE SET NULL)
  - `conversation_id`: BIGINT UNSIGNED NULL (FK -> `conversations.id` ON DELETE SET NULL)
  - `assigned_to`: BIGINT UNSIGNED NULL (FK -> `users.id` ON DELETE SET NULL)
  - `title`: VARCHAR(255) NOT NULL
  - `value`: DECIMAL(12, 2) NOT NULL DEFAULT 0.00
  - `priority`: VARCHAR(20) NOT NULL DEFAULT 'medium'
  - `position`: INT UNSIGNED NOT NULL DEFAULT 0
  - `custom_fields`: JSON NULL
  - `created_at`, `updated_at`: TIMESTAMP NULL
  - **Indexes:** INDEX(`column_id`, `position`), INDEX(`workspace_id`, `contact_id`), INDEX(`board_id`, `assigned_to`)

### Table 14: `automation_flows`
Workflow rules (e.g., auto-welcome, after-hours reply, tag-based triggers).
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
- `name`: VARCHAR(255) NOT NULL
- `trigger_type`: VARCHAR(100) NOT NULL (`keyword`, `new_contact`, `status_change`, `kanban_move`, `webhook`)
- `trigger_config`: JSON NOT NULL
- `nodes`: JSON NOT NULL (Step definitions)
- `edges`: JSON NOT NULL (Transitions between steps)
- `is_active`: BOOLEAN NOT NULL DEFAULT false
- `created_at`, `updated_at`: TIMESTAMP NULL
- `deleted_at`: TIMESTAMP NULL (SoftDeletes)
- **Indexes:** INDEX(`workspace_id`, `trigger_type`, `is_active`)

### Table 15, 16: `ai_agents` & `ai_knowledge_sources`
AI bot and RAG document grounding.
- `ai_agents`:
  - `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  - `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
  - `name`: VARCHAR(255) NOT NULL
  - `model`: VARCHAR(100) NOT NULL DEFAULT 'gemini-1.5-flash'
  - `system_prompt`: TEXT NOT NULL
  - `is_active`: BOOLEAN NOT NULL DEFAULT false
  - `auto_reply_enabled`: BOOLEAN NOT NULL DEFAULT false
  - `handoff_keywords`: JSON NULL (`['agent', 'human', 'support', 'help']`)
  - `temperature`: DECIMAL(2, 1) NOT NULL DEFAULT 0.7
  - `created_at`, `updated_at`: TIMESTAMP NULL
  - **Indexes:** INDEX(`workspace_id`, `is_active`)
- `ai_knowledge_sources`:
  - `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  - `workspace_id`: BIGINT UNSIGNED NOT NULL (FK -> `workspaces.id` ON DELETE CASCADE)
  - `ai_agent_id`: BIGINT UNSIGNED NOT NULL (FK -> `ai_agents.id` ON DELETE CASCADE)
  - `type`: VARCHAR(50) NOT NULL (`pdf`, `text`, `url`, `faq`)
  - `title`: VARCHAR(255) NOT NULL
  - `source_uri`: VARCHAR(1000) NULL
  - `content`: LONGTEXT NULL
  - `token_count`: INT UNSIGNED NOT NULL DEFAULT 0
  - `created_at`, `updated_at`: TIMESTAMP NULL
  - **Indexes:** INDEX(`ai_agent_id`, `type`)

### Table 17: `webhook_logs`
Meta webhook audit trail with `MassPrunable`.
- `id`: BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `phone_number_id`: VARCHAR(100) NULL
- `event_type`: VARCHAR(100) NULL (`messages`, `statuses`, `message_template_status_update`)
- `payload`: JSON NOT NULL
- `processed`: BOOLEAN NOT NULL DEFAULT false
- `error_message`: TEXT NULL
- `created_at`: TIMESTAMP NULL
- **Indexes:** INDEX(`phone_number_id`), INDEX(`event_type`), INDEX(`processed`), INDEX(`created_at`)
- **Pruning Policy:** Automatically delete records older than 14 days via Laravel `MassPrunable`.
