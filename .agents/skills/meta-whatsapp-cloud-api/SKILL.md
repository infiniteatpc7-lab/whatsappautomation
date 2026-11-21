---
name: meta-whatsapp-cloud-api
description: Domain rules, webhook ingestion reliability, 24-hour service window enforcement, Meta Cloud API client conventions, media persistence, and broadcast rate-limiting. Activate when building Meta API integrations, webhooks, message sending, template syncing, or broadcast campaign dispatchers.
---

# Meta WhatsApp Cloud API Integration Rules

This skill documents the domain rules, webhook lifecycle, rate-limiting, and security practices required when integrating with the official Meta WhatsApp Business Cloud API.

---

## 1. Phone Number Normalization (`wa_id`)

All WhatsApp identifiers (`wa_id`) stored in `contacts.wa_id` must be normalized to strict digits-only E.164 without `+`, spaces, dashes, or prefixes:

```php
// app/Models/Contact.php
public static function normalizeWaId(string $phone, string $defaultCountry = '91'): string
{
    // 1. Remove all non-digits
    $digits = preg_replace('/\D+/', '', $phone);

    // 2. Remove leading zeros
    $digits = ltrim($digits, '0');

    // 3. Auto-prefix Indian numbers if 10 digits are provided
    if (strlen($digits) === 10 && $defaultCountry === '91') {
        $digits = '91' . $digits;
    }

    return $digits;
}
```

- **Example:** `+91 97275-09785` -> `919727509785`.
- **Database Rule:** The `contacts` table enforces `UNIQUE(workspace_id, wa_id)` to prevent duplicate contacts per tenant.

---

## 2. 24-Hour & Free Entry Windows

Meta enforces strict customer care window rules:

### Customer Care Window (`conversations.window_expires_at`)
- **Rule:** When a customer sends an inbound message, a 24-hour customer care window opens (`now() + 24 hours`).
- **While Open (`isWindowOpen() === true`):** Agents can send free-form text, attachments, quick replies, and interactive messages.
- **When Expired (`isWindowOpen() === false`):** 
  - Free-form messages are **STRICTLY BLOCKED** by the application and by Meta.
  - The UI must disable the composer input and display the template picker.
  - The agent must send a Meta-approved **Template Message** to re-open the conversation.

### Click-to-WhatsApp Free Entry Window (`conversations.free_entry_expires_at`)
- Inbound messages originating from Click-to-WhatsApp (CTWA) Facebook/Instagram ads open a **72-hour (or 7-day)** free entry window.
- In this window, all outbound messages (even templates) are non-billable by Meta.
- Track expiration in `conversations.free_entry_expires_at`.

---

## 3. Webhook Ingestion & Reliability Architecture

Meta webhooks can arrive with massive spikes, duplicates, and out-of-order delivery. Follow this pipeline:

```
[Meta Cloud API] 
       │ POST /api/webhooks/whatsapp
       ▼
[ValidateSignature Middleware] (Checks X-Hub-Signature-256 with APP_SECRET)
       │
       ├─► [Store Raw in webhook_logs]
       ├─► [Dispatch ProcessWhatsAppWebhookJob to Redis 'webhooks' Queue]
       ▼
[Return HTTP 200 OK in < 100ms]
```

### Critical Webhook Rules
1. **Sub-100ms Response:** Meta requires an immediate HTTP 200 OK. Never perform database lookups, file downloads, or external API calls synchronously inside the webhook controller.
2. **Idempotency via `wamid`:** Inbound messages and status updates have a unique Meta message ID (`messages.wamid`). Check for existing `wamid` before inserting new messages.
3. **Out-of-Order Status Guard (`status_rank`):**
   - Webhooks can arrive out of order (e.g., `read` arrives before `delivered`).
   - Use `MessageStatus::rank()` to guard against regressions:
     - `queued` = 0
     - `sent` = 1
     - `delivered` = 2
     - `read` = 3
     - `failed` = 9
   - **RULE:** Never downgrade status. Only update if `incoming_rank >= current_rank`.
4. **Immediate Media Persistence:**
   - Meta media URLs delivered in inbound webhooks expire within minutes.
   - When an inbound media webhook arrives (`image`, `audio`, `video`, `document`), dispatch `DownloadWhatsAppMediaJob` to download the asset from `https://lookaside.fbsbx.com/...` using the System User access token, and save it permanently to local storage or S3 (`messages.media_path`).

---

## 4. Meta Billing & Category Tracking

Meta bills conversations based on message category and country:

- **Categories:** `marketing`, `utility`, `authentication`, `service`, `meta_business_agent`, `free`.
- **Pricing Metadata:** Captured from status webhooks under `entry.*.changes.*.value.statuses.*.pricing`:
  ```json
  {
    "pricing": {
      "billable": true,
      "pricing_model": "CBP",
      "category": "marketing"
    }
  }
  ```
- Store `pricing_category` and `is_billable` on the `messages` record for analytics and billing verification.

---

## 5. 3-Tier Horizon Queue Isolation

Separate queue workloads to prevent broadcast blasts from stalling real-time inbox messaging:

| Queue Name | Priority | Purpose | Retry Policy |
|---|---|---|---|
| `webhooks` | **Highest** | Processing raw incoming Meta payloads (`messages`, `statuses`). | 3 retries, exponential backoff |
| `inbox` | **High** | Real-time agent outbound messages and WebSocket broadcasts via Laravel Reverb. | 2 retries |
| `broadcasts` | **Normal** | Mass marketing campaigns. Chunked into batches of 100, throttled per `phone_number_id` via Redis limiter. | 5 retries on HTTP 429 |

### Broadcast Rate Limiting
- Meta enforces messaging tiers (Tier 1: 1,000 / 24h; Tier 2: 10,000 / 24h; Tier 3: 100,000 / 24h).
- Cap outbound broadcast dispatch to **80 messages/second per phone number** via Redis `Redis::throttle('wa_broadcast:' . $phoneNumberId)->allow(80)->every(1)`.
- If Meta returns HTTP `429 Too Many Requests` or `131056` (Rate limit hit), release the job with a 60-second backoff.
- **Compliance Check:** Never send campaigns to contacts where `opt_in_status === 'opted_out'`.
