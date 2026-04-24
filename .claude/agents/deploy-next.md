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
2. Run `npm run build` with pilot env — the Beta badge gate needs `NEXT_PUBLIC_PILOT=1` baked into the client bundle at build time:
```bash
NEXT_PUBLIC_PILOT=1 npm run build
```
3. Run `git status` — warn if there are uncommitted changes.

## Deploy
4. Rsync to pilot app root:
```bash
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env.local' \
  --exclude '.git' \
  --exclude 'dump.rdb' \
  --exclude 'data/' \
  --exclude '.beads/' \
  --exclude 'presentation/' \
  --exclude '.next/cache' \
  /Users/zafar/Documents/self_next/erpnext-ui/ ice-production:/var/www/erpnext-ui-next/
```

5. Install production deps on server:
```bash
ssh ice-production "cd /var/www/erpnext-ui-next && npm install --production"
```

6. Start or restart PM2. First deploy needs `pm2 start`; subsequent deploys just `pm2 restart`:
```bash
ssh ice-production "pm2 describe erpnext-ui-next >/dev/null 2>&1 && pm2 restart erpnext-ui-next --update-env || (cd /var/www/erpnext-ui-next && PORT=3004 NEXT_PUBLIC_PILOT=1 pm2 start npm --name erpnext-ui-next -- start) && pm2 save"
```

## Post-deploy
7. Verify the app is running:
```bash
ssh ice-production "pm2 status erpnext-ui-next && curl -skI https://next.erpstable.com/login | head -5"
```
Expect `HTTP/2 200` from the curl.

Report each step's result. If any step fails, stop and report the error.

## Notes
- Pilot and prod share the same tenant Frappe backends. Never deploy `next` to `/var/www/erpnext-ui/` — that would overwrite prod.
- Phase 1 (`useBoot`) requires each tenant to have `stable_erp_api.get_boot` Server Script pasted in its ERPNext admin UI. Deploying without it will cause `get_boot` calls to 404 until the script is added.
