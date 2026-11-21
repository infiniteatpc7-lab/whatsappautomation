---
name: laravel-mysql-architecture
description: Backend architectural patterns, Laravel 13 + PHP 8.3 conventions, MySQL 8 multi-tenant design, model attributes, and query standards. Activate when creating or modifying migrations, models, enums, controllers, services, actions, queue jobs, or database queries.
---

# Laravel 13 + MySQL 8 Architecture & Standards

This skill documents the backend architecture, PHP 8.3/Laravel 13 coding standards, single-database multi-tenancy rules, and MySQL 8 design conventions used throughout this application.

---

## 1. Technology Stack & Configuration

- **PHP:** `^8.3` with strict types (`declare(strict_types=1);`), backed enums, and native attribute annotations.
- **Framework:** Laravel 13 (`laravel/framework: ^13.17`).
- **Database:** MySQL 8 with `InnoDB`, `utf8mb4`, and collation `utf8mb4_0900_ai_ci`.
  - Ensures full support for 4-byte emojis (`👍`, `🎉`, `🙏`), Indic scripts (Hindi, Gujarati, Tamil, etc.), and case-insensitive unique constraints.
- **Queues:** Redis with Laravel Horizon.
- **WebSockets:** Laravel Reverb for real-time inbox events.
- **Frontend Bridge:** Inertia.js v3 (`inertiajs/inertia-laravel: ^3.7`).

---

## 2. Laravel 13 Model & Code Conventions

Always adhere to modern Laravel 13 conventions matching `app/Models/User.php`:

### Model Definition Patterns
1. **Attributes over properties:** Use `#[Fillable([...])]` and `#[Hidden([...])]` instead of protected `$fillable` or `$hidden` arrays:
   ```php
   use Illuminate\Database\Eloquent\Attributes\Fillable;
   use Illuminate\Database\Eloquent\Attributes\Hidden;

   #[Fillable(['name', 'email', 'phone', 'current_workspace_id'])]
   #[Hidden(['password', 'remember_token'])]
   class User extends Authenticatable { ... }
   ```
2. **Casts Method:** Use the `casts(): array` method instead of the legacy `$casts` property:
   ```php
   protected function casts(): array
   {
       return [
           'status' => WhatsAppAccountStatus::class,
           'access_token' => 'encrypted',
           'app_secret' => 'encrypted',
           'settings' => 'array',
           'is_active' => 'boolean',
       ];
   }
   ```
3. **Strict Relationship Return Types:** Every relationship method must declare its exact Eloquent return type:
   ```php
   public function workspace(): BelongsTo
   {
       return $this->belongsTo(Workspace::class);
   }

   public function messages(): HasMany
   {
       return $this->hasMany(Message::class);
   }
   ```
4. **Thin Controllers & Single-Action Classes:**
   - Controllers handle HTTP validation and response dispatching only.
   - Complex domain operations belong in dedicated action classes (`app/Actions/WhatsApp/`) or services (`app/Services/WhatsApp/`).

---

## 3. Single-Database Multi-Tenancy Architecture

All tenant entities belong to a single MySQL database partitioned by `workspace_id`.

### The Leading Column Index Rule
Every tenant-scoped table MUST place `workspace_id` as the **first column in every composite index**:
```php
// Good: Leading workspace_id index
$table->index(['workspace_id', 'status', 'last_message_at']);
$table->unique(['workspace_id', 'wa_id']);

// Bad: Missing leading tenant index causes full table scans across all tenants
$table->index(['status', 'last_message_at']);
```

### Multitenancy Scoping Guardrail
- Use the `BelongsToWorkspace` trait located at `app/Models/Concerns/BelongsToWorkspace.php`.
- **CRITICAL RULE:** **NEVER** apply an Eloquent Global Scope that checks `auth()->user()->current_workspace_id` on tenant models.
  - *Why:* Meta Cloud API webhooks (`POST /api/webhooks/whatsapp`), scheduled broadcast queue workers, and background automation jobs run without an active session or authenticated user. A global scope tied to `auth()->user()` will return 0 rows or throw exceptions in background workers.
  - *Solution:* Always scope tenant queries explicitly in controllers via `$workspace->contacts()` or scope methods `forWorkspace($workspaceId)`. Use Laravel Policies (`app/Policies/`) to verify tenant boundaries in HTTP requests.

---

## 4. Primary Key & Identifier Conventions

1. **Internal Foreign Keys:** Use standard `BIGINT UNSIGNED` (`$table->id()`) for all relational joins and internal performance.
2. **Public Identifiers:** Use UUID v4 on public-facing entities (`workspaces`, `conversations`, `campaigns`, `kanban_boards`) using the `HasPublicUuid` trait at `app/Models/Concerns/HasPublicUuid.php`. Expose the `uuid` in URLs and Inertia route parameters, not internal auto-increment IDs.
3. **Enum Columns:** Always use `VARCHAR(50)` in migrations paired with PHP 8.3 Backed Enums in `app/Enums/`. Avoid native MySQL `ENUM(...)` columns because changing enum values requires costly `ALTER TABLE` table locks in production.

---

## 5. Security & Encryption Standards

- Never store raw Meta System User tokens or App Secrets in plaintext.
- Cast `access_token` and `app_secret` as `'encrypted'` in model casts.
- Add `access_token` and `app_secret` to `#[Hidden([...])]` on the `WhatsAppAccount` model so they are never leaked in Inertia shared state or serialized JSON.

---

## 6. Complete Schema Reference

For the comprehensive 16-table schema including column types, foreign key constraints, composite index definitions, and pruning policies, inspect the companion reference document:

👉 [database-schema.md](file:///c:/Users/Adhmin/Desktop/dashboard/laravel-shadcn-dashboard/.agents/skills/laravel-mysql-architecture/resources/database-schema.md)
