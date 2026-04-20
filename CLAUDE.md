# Stable ERP — Project Conventions

Simplified ERPNext frontend for non-accountant users.

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript 5 (strict)
- **Styling**: TailwindCSS 4 + shadcn/ui (new-york style, neutral palette)
- **State**: Zustand 5 (client stores) + React Query 5 (server state)
- **Forms**: React Hook Form + Zod 4
- **Utilities**: date-fns 4, next-themes, lucide-react, sonner (toasts)

## Architecture

- **API layer**: `src/lib/frappe-client.ts` -> Next.js proxy at `src/app/api/proxy/[...path]/route.ts`
- **Stores**: `src/stores/{name}-store.ts` — auth-store, company-store, ui-settings-store
- **Query keys**: Centralized in `src/hooks/query-keys.ts`
- **Hooks**: One per feature — `src/hooks/use-{feature}.ts`
- **Components**: `"use client"` everywhere; UI primitives in `src/components/ui/`, shared in `src/components/shared/`

## File Naming

- Components: `kebab-case.tsx`
- Hooks: `use-{feature}.ts`
- Stores: `{name}-store.ts`
- Types: `{entity}.ts`

## Formatting Standards

Always use `formatDate()`, `formatNumber()`, `formatCurrency()` from `@/lib/formatters`.
Never use raw `toLocaleString()`, `toLocaleDateString()`, or hardcoded locales.

## Currency Display Rules

- **Always show currency symbols** (e.g. `$`, `сўм`), never raw ISO codes (e.g. `USD`, `UZS`).
- Use `useCurrencyMap()` from `@/hooks/use-accounts` to look up symbols from currency codes.
- Default number format is Russian: `1 234,56` (space thousands, comma decimal).
- Multi-currency balances: show `1 234,56 $ / 12 345 678,00 сўм` (account currency / base currency).

## Skills

- **financial-advisor**: Accounting correctness — double-entry rules, JE construction, multi-currency exchange rates, query invalidation, report parsing guards
- **erp-expert**: ERP domain knowledge — invoice lifecycle, payment allocation, CoA conventions, UX patterns, cross-platform terminology (ERPNext/QB/NetSuite)

## Routing Rules

- `/` renders `src/app/page.tsx` — the public marketing landing page. **Do not add a redirect from `/` in `next.config.ts`.**
- App routes live under `src/app/(app)/` and are protected by `AuthGuard` (redirects to `/login` if unauthenticated).
- `erpstable.com` → landing page (`/`). `app.erpstable.com` → app (nginx redirects `/` → `/login`).

## Production Infrastructure

- **Server**: `173.212.195.32` (SSH alias: `ice-production`)
- **App root**: `/var/www/erpnext-ui` — no git on server, deploy via rsync
- **PM2 process**: name `erpnext-ui`, id 2, port 3002
- **Deploy**: build locally → rsync (exclude `node_modules`, `.env.local`, `.git`, `dump.rdb`, `data/`, `.beads/`, `presentation/`) → `npm install --production` on server → `pm2 restart erpnext-ui && pm2 save`
- **Nginx configs**: `/etc/nginx/conf.d/app.erpstable.com.conf` and `/etc/nginx/conf.d/erpstable.com.conf` (these take priority over hestia's configs in `/etc/nginx/conf.d/domains/`)
- **SSL certs**: `/home/hestiaadmin/conf/web/erpstable.com/ssl/` and `/etc/letsencrypt/live/app.erpstable.com/`
- **Logs**: `/root/.pm2/logs/erpnext-ui-{out,error}.log`

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier — format all src files
npm run format:check # Prettier — check without writing
npm run test         # Vitest — run tests once
npm run test:watch   # Vitest — watch mode
npx shadcn@latest add <component>  # Add shadcn/ui component
```

## Agents & Commands

- **`@verify-app`**: Run build + lint + format + tests — use after any significant change
- **`@deploy`**: Full production deploy (build → rsync → PM2 restart)
- **`/deploy`**: Slash command shortcut for the deploy agent

## Gotchas

_Add a line here every time Claude does something wrong, so it doesn't repeat._

- ERPNext returns HTTP 417 for informational messages (e.g. "Item Price added") even when the doc IS saved — don't treat 417 as a hard error in `frappeCall`.
- `Space_Grotesk` font does NOT support Cyrillic — only use `Inter` for Russian/Uzbek text.
- Never use `git add -A` or `git add .` — always stage specific files to avoid committing `.env.local` or `data/`.
- The proxy at `/api/proxy/[...path]` requires `X-Frappe-Site` header — requests without it return 400.
- `frappe.client.cancel` may fail on some doctypes — the client has a fallback to `run_doc_method`.
- Don't add redirects from `/` in `next.config.ts` — the landing page lives at `/`, the app at `/login`.
- `clearTenantState()` must be called on login (before setting new tenant) to prevent cross-tenant data leaks.
- `settings.local.json` is gitignored (personal/machine-specific). `settings.json` is committed (shared team config).
