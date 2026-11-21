---
name: saas-security-and-testing
description: Security guardrails, multi-tenant isolation tests, webhook verification, code formatting standards, and verification checklists. Activate when reviewing code, implementing authentication or authorization, writing PHPUnit tests, or completing any feature phase.
---

# SaaS Security Guardrails & Automated Testing Standards

This skill documents the mandatory security practices, authorization checks, test coverage requirements, and code style standards for this WhatsApp SaaS application.

---

## 1. Multi-Tenant Security & Isolation Checklist

Before committing any backend controller, service, or route, verify each of the following security rules:

### 1. Route-Level Authorization
- All routes under `/dashboard/*` must require authentication (`auth`) and workspace membership middleware (`VerifyWorkspaceMembership`).
- Unauthenticated requests must redirect to `/login`.
- If a user attempts to access a workspace they do not belong to, return an HTTP `403 Forbidden`.

### 2. Tenant Data Isolation Guardrail
- **Rule:** Never retrieve a tenant-owned record using bare model lookups like `Contact::findOrFail($id)` or `Conversation::where('uuid', $uuid)->first()`.
- **Enforcement:** Always chain lookups through the authenticated tenant workspace:
  ```php
  // Good: Scoped to active workspace
  $contact = $request->user()->currentWorkspace->contacts()->findOrFail($id);

  // Good: Explicit workspace query constraint
  $conversation = Conversation::where('workspace_id', $workspaceId)
      ->where('uuid', $uuid)
      ->firstOrFail();

  // Dangerous: Insecure Direct Object Reference (IDOR) vulnerability!
  $conversation = Conversation::where('uuid', $uuid)->firstOrFail();
  ```

### 3. Credential Leak Prevention
- Meta Cloud API credentials (`access_token`, `app_secret`) must never be leaked to client browsers.
- Ensure `WhatsAppAccount` model has `access_token` and `app_secret` declared in `#[Hidden([...])]`.
- Verify that `HandleInertiaRequests::share()` never includes sensitive credentials in shared workspace or account props. Only expose non-sensitive metadata (`waba_id`, `phone_number_id`, `display_phone_number`, `quality_rating`, `status`).

### 4. Meta Webhook Signature Validation
- Webhooks received at `POST /api/webhooks/whatsapp` must be validated using HMAC-SHA256 against the Meta App Secret:
  ```php
  $signature = $request->header('X-Hub-Signature-256');
  $expected = 'sha256=' . hash_hmac('sha256', $request->getContent(), config('services.meta.app_secret'));

  if (!hash_equals($expected, (string) $signature)) {
      abort(403, 'Invalid Meta signature');
  }
  ```

---

## 2. Automated Testing Standards

Every backend feature phase must include automated PHPUnit/Pest feature tests located under `tests/Feature/`.

### Mandatory Test Scenarios
1. **Tenant Isolation Test:**
   - Create Workspace A and Workspace B.
   - Create Contact A in Workspace A.
   - Send request as User in Workspace B attempting to view, edit, or delete Contact A.
   - Assert response returns `404 Not Found` or `403 Forbidden`.
2. **Database Constraint Tests:**
   - Duplicate `(workspace_id, wa_id)` throws `QueryException` (unique violation).
   - Duplicate `messages.wamid` throws `QueryException` (idempotency guard).
3. **Domain Logic Tests:**
   - `Contact::normalizeWaId()` correctly strips formatting and handles Indian numbers (`+91 98250 12345` -> `919825012345`).
   - `Conversation::isWindowOpen()` returns `true` within 24 hours of `last_inbound_at`, and `false` after 24 hours.
   - `MessageStatus::rank()` correctly orders status integers to prevent status regression.
   - `WhatsAppAccount` access token encryption and decryption cycle.

### Execution Command
Run tests before marking any phase complete:
```sh
php artisan test
```

---

## 3. Code Style & Linting Standards

This repository uses Laravel Pint for automated PHP code style enforcement:

```sh
# Lint and format modified files
./vendor/bin/pint --dirty

# Or format entire codebase
./vendor/bin/pint
```

- Follow PSR-12 and Laravel Pint defaults.
- Always run Pint before submitting or staging code.
