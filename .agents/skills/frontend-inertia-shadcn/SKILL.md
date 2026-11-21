---
name: frontend-inertia-shadcn
description: Frontend guidelines, React 19 + Inertia v3 + Tailwind v4 + shadcn/ui conventions, mock-to-live migration patterns, and component reuse rules. Activate when building or updating React pages, components, data tables, chat interfaces, Kanban boards, or sidebar navigation.
---

# Frontend Development: Inertia.js v3 + React 19 + shadcn/ui

This skill documents the frontend architecture, installed package conventions, design system tokens, and mock-to-live migration rules for this dashboard application.

---

## 1. Exact Installed Stack & Versions

Verified from `package.json`:

- **Framework & Runtime:** React `^19.3.1`, React DOM `^19.3.1`, Inertia.js React `^3.11.0`.
- **CSS & Styling:** Tailwind CSS `^4.0.0`, `@tailwindcss/vite: ^4.0.0`, `tailwindcss-animate`, `tw-animate-css`.
- **UI Components:** shadcn/ui primitives built on `@base-ui/react: ^1.9.0` and `@base-ui/utils: ^0.5.0`.
- **State & Data Fetching:**
  - TanStack React Query `^5.108.0` + Devtools
  - TanStack React Table `^9.3.1` (used in `components/data-table/`)
  - TanStack React Form `^1.33.5`
  - Zustand `^5.1.0` (client-side state)
- **Drag and Drop:** `@dnd-kit/core: ^6.3.1`, `@dnd-kit/sortable: ^10.0.0`, `@dnd-kit/modifiers`, `@dnd-kit/utilities` (used in Kanban).
- **Charts:** `recharts: ^3.11.0` (used in Overview analytics).
- **Icons:** `@tabler/icons-react: ^3.52.0`.
- **Feedback & Notifications:** `sonner: ^2.0.8` (via `toast.success()`, `toast.error()`).
- **File Uploads:** `react-dropzone: ^20.2.1` (wrapped in `components/file-uploader.tsx`).
- **Theme & Customization:** `next-themes: ^0.4.6` + custom dynamic customizer (`theme-customizer.tsx`).

---

## 2. Component Reuse Before Creating

**DO NOT** install additional component libraries or reinvent UI patterns. Always reuse existing primitives located in `resources/js/components/`:

| Need | Reuse Location | Notes |
|---|---|---|
| **Buttons & Actions** | `components/ui/button.tsx` | Supports variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. Size: `default`, `xs`, `sm`, `lg`, `icon`. Fully honors `--radius`. |
| **Data Tables & Pagination** | `components/data-table/*` | Features search, column filtering, pagination, faceted filters, and column toggling powered by TanStack Table v9. |
| **Form Inputs & Validation** | `components/ui/input.tsx`<br>`components/ui/select.tsx`<br>`components/ui/textarea.tsx`<br>`components/forms/fields/*` | Base UI primitives styled with Tailwind and connected to TanStack Form / Inertia forms. |
| **Modals & Dialogs** | `components/ui/dialog.tsx`<br>`components/ui/alert-dialog.tsx`<br>`components/ui/sheet.tsx` | Base UI accessible dialogs and slide-out side sheets. |
| **CSV & File Uploads** | `components/file-uploader.tsx` | Drag-and-drop zone with file size validation, mime-type filtering, and progress display. |
| **Command Palette** | `components/kbar/*` | Global keyboard shortcuts (`Ctrl+K` / `Cmd+K`) and action switcher. |

---

## 3. Mock-to-Live Migration Rules

The codebase includes prototype feature folders under `resources/js/features/` with mock data and Zustand stores. When connecting real backend APIs:

### Feature: Shared Inbox (`features/chat/`)
- **Current State:** Reads static conversations from `features/chat/data/mock-conversations.ts` using `features/chat/context/chat-context.tsx`.
- **Live Migration:**
  - Pass initial conversation list and active conversation via Inertia page props in `Pages/Dashboard/Chat/Index.tsx`.
  - Subscribe to Laravel Reverb WebSockets on channel `workspaces.{workspaceId}.inbox` using Laravel Echo.
  - On incoming `NewWhatsAppMessageReceived` event, append message to the conversation thread and update the list.
  - Honor the 24-hour customer care window by inspecting `conversation.window_expires_at`:
    - If expired, disable the text input area and display the Template selector modal.

### Feature: Kanban Pipeline (`features/kanban/`)
- **Current State:** Mock cards in `features/kanban/utils/mock-data.ts` using `@dnd-kit`.
- **Live Migration:**
  - Receive board columns and cards from Laravel endpoint `GET /dashboard/kanban`.
  - On `DragEnd`, update card position optimistically and send `PATCH /api/kanban/cards/{id}/move` with `{ column_id, position }`.
  - If target column has `auto_template_id` configured, trigger toast notification confirming automated WhatsApp message dispatch.

### Feature: Contacts & Users CRM (`features/users/`)
- **Current State:** Mock users table.
- **Live Migration:**
  - Connect to `contacts` table via `GET /dashboard/users` (or `/dashboard/contacts`).
  - Wire CSV import button to `POST /dashboard/contacts/import` using `file-uploader.tsx`.
  - Display WhatsApp opt-in status badge (`opted_in` in green, `opted_out` in muted red).

---

## 4. Theme & Layout Consistency

- **Theme Preservation:** Always test with `whatsapp.css` theme (`data-theme="whatsapp"` in `resources/css/themes/whatsapp.css`), featuring official WhatsApp emerald green accents (`oklch(0.4335 0.0754 182.2315)`).
- **Navigation Configuration:** Navigation is centralized in `resources/js/config/nav-config.ts`.
  - Update route URLs and titles only as modules go live.
  - Keep demo sections (`Elements`, `Forms`, `React Query Demo`) in place until the user explicitly requests their removal.
- **Dynamic Radius:** The entire UI dynamically respects the CSS variable `--radius`. Never hardcode `rounded-full` or fixed pixel radius on buttons or cards unless explicitly required (e.g., circular avatars).
