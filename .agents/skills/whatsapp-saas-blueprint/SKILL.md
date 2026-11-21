---
name: whatsapp-saas-blueprint
description: Architecture blueprint, product positioning, UI-to-feature mapping, and 5-phase execution plan for the WhatsApp Business API SaaS in Laravel 13 + React 19 shadcn dashboard. Activate when planning features, scoping tasks, adding routes, configuring workspace settings, or deciding roadmap priorities.
---

# WhatsApp SaaS Blueprint & Product Roadmap

This skill defines the product vision, competitive positioning, existing UI module mapping, and phased execution roadmap for the multi-tenant WhatsApp Business API (Cloud API) SaaS built on top of this Laravel 13 + React 19 Inertia dashboard.

---

## 1. Product Positioning & Strategy

### Target Market
- **Primary Audience:** Indian SMBs, D2C brands, manufacturing suppliers (e.g., laser machinery, textile, hardware), clinics, schools, and digital agencies managing multiple client accounts.
- **Value Proposition:** 
  1. Combines the simplicity of **11za** (straightforward broadcasts, template approval, simple shared inbox).
  2. Integrates the operational power of **UpMatrix** (Kanban visual deal pipelines, column-drop automated WhatsApp notifications, stage tracking).
  3. **0% Meta Markup:** Tenants connect directly to Meta Cloud API billing. No per-conversation markup on Meta API conversation fees, making it 5-10x cheaper than legacy BSPs.

### Onboarding Strategy (Two-Phase Evolution)
1. **Phase 1 (Manual BYO Cloud API Credentials):**
   - Ideal for developers, agencies, and early tenants while Meta Tech Provider app approval is pending.
   - Users create a Meta Developer App, generate a permanent System User Token, register a WABA (`waba_id`) and Phone Number ID (`phone_number_id`), and paste credentials directly into `Pages/Dashboard/Workspace.tsx`.
   - Webhook URL and Webhook Verify Token are generated per workspace or globally with verification challenge support.
2. **Phase 2+ (Meta Embedded Signup v4 + Coexistence):**
   - Facebook Login for Business popup (Embedded Signup v4).
   - Allows users to link an existing WhatsApp Business number without losing chats (WhatsApp Business App coexistence) or register a new virtual 10-digit number.
   - Automatically exchanges OAuth code for WABA ID, Phone Number ID, and System User Token, writing directly into the exact same `whatsapp_accounts` table schema created in Phase 1.

---

## 2. Existing UI-to-Feature Mapping

Every module in `resources/js/` has a 1-to-1 mapping into WhatsApp SaaS capabilities. Never throw away existing frontend code—wire backend APIs directly into these components:

| Existing Frontend Route & File | Target WhatsApp SaaS Capability | Implementation Details |
|---|---|---|
| `Pages/Dashboard/Workspace.tsx` | **Cloud API Credentials & Webhook Setup** | WABA ID, Phone Number ID, encrypted System User Token, Webhook Verify Token display, and "Test Meta Connection" ping button. |
| `Pages/Dashboard/Chat/Index.tsx`<br>`features/chat/` | **Shared Team Inbox** | Real-time agent chat with 24h customer care window indicator, WhatsApp template fallback picker, quick canned responses, contact metadata sidebar, internal notes, and agent assignment. |
| `Pages/Dashboard/Users/Index.tsx`<br>`components/data-table/` | **Contacts CRM & CSV Import** | Customer list with normalized `wa_id` (E.164), opt-in status (`opted_in`, `opted_out`), tags, custom attributes, and bulk CSV contact upload using `components/file-uploader.tsx`. |
| `Pages/Dashboard/Kanban/Index.tsx`<br>`features/kanban/` | **Lead & Order Pipeline** | Visual deal board (`Backlog`, `New Lead`, `Demo Scheduled`, `Quotation Sent`, `Closed Won`). Cards linked to WhatsApp contacts and conversations. Moving cards between columns triggers automated WhatsApp utility templates. |
| `Pages/Dashboard/Product/Index.tsx`<br>`features/products/` | **Template Manager & Broadcast Campaigns** | Sync approved Meta message templates (Header, Body, Footer, Buttons) and create throttled broadcast campaigns targeting filtered contact segments. |
| `Pages/Dashboard/AIChat/Index.tsx`<br>`features/ai-chat/` | **AI Customer Agent & Knowledge Base** | AI auto-reply bot with company document uploads (PDF/URL RAG), multilingual Indic support (Hindi, Gujarati, Hinglish), voice note transcription, and human agent takeover handoff. |
| `Pages/Dashboard/Overview.tsx`<br>`features/overview/` | **Analytics & Meta Billing Insights** | Inbound/outbound message volume, delivery/read rates, 24h window expiration alerts, and Meta category billing tracking (Marketing, Utility, Service, Free Entry). |

---

## 3. 5-Phase Execution Plan

### Phase 1: Core Foundation & Database Architecture (COMPLETED)
- Database: MySQL 8 with `InnoDB`, `utf8mb4`, and `utf8mb4_0900_ai_ci`.
- 14 Backed Enums in `app/Enums/` (`WorkspaceRole`, `WhatsAppAccountStatus`, `OptInStatus`, `ConversationStatus`, `MessageDirection`, `MessageType`, `MessageStatus`, `TemplateCategory`, `CampaignStatus`, etc.).
- 2 Essential Traits in `app/Models/Concerns/`: `BelongsToWorkspace` and `HasPublicUuid`.
- 17 Migrations & 19 Eloquent Models covering workspaces, accounts, contacts, templates, campaigns, conversations, messages, notes, kanban boards/columns/cards, automation flows, and webhook logs.
- `DemoWorkspaceSeeder` generating demo workspace, WhatsApp accounts, contacts, templates, conversations, and Kanban cards.

### Phase 2: Meta Cloud API Engine & Webhook Reliability
- `MetaCloudClient` service in `app/Services/WhatsApp/`:
  - Methods: `sendMessage()`, `sendTemplate()`, `fetchTemplates()`, `registerPhoneNumber()`, `uploadMedia()`, `getMediaUrl()`.
- Global webhook endpoint `POST /api/webhooks/whatsapp` + `GET /api/webhooks/whatsapp` (hub verification challenge).
- Signature verification middleware (`X-Hub-Signature-256`).
- Webhook logging in `webhook_logs` table with `MassPrunable` retention.
- Background asynchronous processing with `ProcessWhatsAppWebhookJob` on dedicated Redis queue.
- Real-time media download job to local/S3 disk (Meta media URLs expire in minutes).

### Phase 3: Real-Time Shared Inbox & Chat Engine
- Replace mock Zustand chat store (`features/chat/`) with live Inertia and REST endpoints.
- Laravel Reverb WebSockets broadcasting `NewWhatsAppMessageReceived`, `MessageStatusUpdated`, and `ConversationAssigned`.
- 24-hour service window enforcement:
  - If `window_expires_at > now()`, allow free-form agent text and attachments.
  - If expired, disable text area and display template picker banner ("24h window expired. Send an approved Meta template to re-engage").
- Conversation notes, tag assignment, agent assignment, and status filters (`all`, `unread`, `assigned_to_me`, `resolved`).

### Phase 4: Contacts CSV Importer, Templates & Broadcast Engine
- Contacts CSV import via queued chunked job with auto-normalization of Indian phone numbers (`91` prefix).
- Template synchronization from Meta Graph API (`GET /{waba_id}/message_templates`).
- Broadcast Campaign creation with tag/filter segment selection, template parameter mapping (`{{1}}` -> `{{name}}`), and scheduling.
- Throttled dispatch engine:
  - Meta Tier-based rate limiter (Tier 1: 1,000 / 24h, Tier 2: 10,000 / 24h, Tier 3: 100,000 / 24h).
  - Rate-limited queue dispatch with Redis throttling (80 msg/sec maximum to prevent HTTP 429).
  - Suppression list: Automatically skip contacts where `opt_in_status === 'opted_out'`.

### Phase 5: Operations, Automations, AI & Embedded Signup
- Kanban column change listener: dropping a card into "Demo Scheduled" auto-dispatches appointment reminder template.
- Automation flow engine (`automation_flows`): trigger -> condition -> WhatsApp action.
- AI Agent bot (`ai_agents`, `ai_knowledge_sources`):
  - Ingest FAQ PDFs, pricing docs, and URLs.
  - Automatic answer generation with strict handoff triggers (`agent`, `support`, `human`, `help`).
  - Voice note transcription (Whisper API) for Hindi/English voice notes.
- Meta Embedded Signup v4 popup integration writing to `whatsapp_accounts`.

---

## 4. Guardrails & Rules

- **Do Not** bypass the 24-hour window by sending free-form outbound text messages after expiration. Always require an approved Template.
- **Do Not** hardcode credentials or secrets in database tables; always cast `access_token` and `app_secret` as `'encrypted'`.
- **Do Not** block webhook responses. Always return `200 OK` in < 100ms and dispatch payload processing to a queue.
- **Do Not** invent custom UI components when existing shadcn/ui primitives (`components/ui/*`, `components/data-table/*`, `components/file-uploader.tsx`) already satisfy requirements.
- **Do** preserve the green WhatsApp branding and theme support in `resources/css/themes/whatsapp.css`.
