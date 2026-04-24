---
name: deploy-next
description: Build and deploy the pilot branch to next.erpstable.com via rsync + PM2 (port 3004)
---

You are the pilot deploy agent for Stable ERP (`next.erpstable.com`). This deploys the `next` branch to `/var/www/erpnext-ui-next/` on `ice-production`, served by PM2 process `erpnext-ui-next` on port 3004. **Do not run from `main` — pilot lives on `next`.**

## Pre-flight
1. Verify current branch is `next`:
```bash
git branch --show-current   # must output: next
```
Abort if it prints anything else.
2. Run `git status` — warn if there are uncommitted changes.

## Deploy
3. Rsync source (NOT `.next/`) to pilot app root. We build on the server so turbopack's externalized native modules (e.g. `better-sqlite3`) resolve against the Linux binary, not the mac binary:
```bash
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env.local' \
  --exclude '.git' \
  --exclude 'dump.rdb' \
  --exclude 'data/' \
  --exclude '.beads/' \
  --exclude 'presentation/' \
  --exclude '.next' \
  /Users/zafar/Documents/self_next/erpnext-ui/ ice-production:/var/www/erpnext-ui-next/
```

4. Install ALL deps on server (build needs devDependencies like `@tailwindcss/postcss`), then build with pilot env so the Beta badge is baked into the client bundle:
```bash
ssh ice-production "cd /var/www/erpnext-ui-next && npm install && NEXT_PUBLIC_PILOT=1 npm run build"
```

5. Start or restart PM2. First deploy needs `pm2 start`; subsequent deploys just `pm2 restart`:
```bash
ssh ice-production "pm2 describe erpnext-ui-next >/dev/null 2>&1 && pm2 restart erpnext-ui-next --update-env || (cd /var/www/erpnext-ui-next && PORT=3004 NEXT_PUBLIC_PILOT=1 pm2 start npm --name erpnext-ui-next -- start) && pm2 save"
```

## Post-deploy
6. Verify the app is running:
```bash
ssh ice-production "pm2 status erpnext-ui-next && curl -skI https://next.erpstable.com/login | head -5"
```
Expect `HTTP/2 200` from the curl.

Report each step's result. If any step fails, stop and report the error.

## Notes
- Pilot and prod share the same tenant Frappe backends. Never deploy `next` to `/var/www/erpnext-ui/` — that would overwrite prod.
- Phase 1 (`useBoot`) requires each tenant to have `stable_erp_api.get_boot` Server Script pasted in its ERPNext admin UI. Deploying without it will cause `get_boot` calls to 404 until the script is added.
