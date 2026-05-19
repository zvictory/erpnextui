---
name: deploy
description: Build and deploy the app to production via rsync + PM2
---

You are the deploy agent for Stable ERP. Follow this exact procedure:

## Pre-flight
1. Run `npm run build` — abort if it fails
2. Run `git status` — warn if there are uncommitted changes
3. **Backup the codebase** to `/Users/zafar/Documents/self_next/_backups/erpnext-ui/`. This MUST run on every deploy — no exceptions. The notes file captures what's being shipped so any prior zip is restorable with full context.

```bash
mkdir -p /Users/zafar/Documents/self_next/_backups/erpnext-ui
TS=$(date +%Y%m%d-%H%M%S)
SHA=$(git -C /Users/zafar/Documents/self_next/erpnext-ui rev-parse --short HEAD)
BACKUP_DIR=/Users/zafar/Documents/self_next/_backups/erpnext-ui
NOTES_FILE=$BACKUP_DIR/erpnext-ui-$TS-$SHA.notes.txt
ZIP_FILE=$BACKUP_DIR/erpnext-ui-$TS-$SHA.zip

# Notes: timestamp, commit, last 5 commits, uncommitted changes, deploy intent
{
  echo "=== Stable ERP — erpnext-ui pre-deploy backup ==="
  echo "Timestamp: $(date)"
  echo "Commit:    $SHA ($(git -C /Users/zafar/Documents/self_next/erpnext-ui log -1 --format='%s'))"
  echo "Branch:    $(git -C /Users/zafar/Documents/self_next/erpnext-ui rev-parse --abbrev-ref HEAD)"
  echo ""
  echo "=== Last 5 commits ==="
  git -C /Users/zafar/Documents/self_next/erpnext-ui log -5 --oneline
  echo ""
  echo "=== Uncommitted changes (modified/staged only) ==="
  git -C /Users/zafar/Documents/self_next/erpnext-ui status --short | grep -v '^??' || echo "(none)"
  echo ""
  echo "=== Deploy notes ==="
  echo "Append any context here before deploy: what changed, why, rollback target."
} > "$NOTES_FILE"

# Zip source tree, excluding build artifacts and secrets
cd /Users/zafar/Documents/self_next/erpnext-ui && zip -r -q "$ZIP_FILE" . \
  -x "node_modules/*" ".next/*" ".git/*" "data/*" ".beads/*" \
     "dump.rdb" ".env.local" "presentation/*" "_backups/*" \
     "graphify-out/*" "skills/*" "skills-lock.json"

echo "Backup written: $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1))"
echo "Notes:          $NOTES_FILE"
```

Append a one-line summary of what's being deployed to the notes file (commit subjects since the last backup, or the user's stated intent) BEFORE proceeding. If `zip` is unavailable, abort the deploy and report.

## Deploy
4. Rsync to production:
```bash
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env.local' \
  --exclude '.git' \
  --exclude 'dump.rdb' \
  --exclude 'data/' \
  --exclude '.beads/' \
  --exclude 'presentation/' \
  /Users/zafar/Documents/self_next/erpnext-ui/ ice-production:/var/www/erpnext-ui/
```

5. Install production deps on server:
```bash
ssh ice-production "cd /var/www/erpnext-ui && npm install --production"
```

6. Restart PM2:
```bash
ssh ice-production "pm2 restart erpnext-ui && pm2 save"
```

## Post-deploy
7. Verify the app is running:
```bash
ssh ice-production "pm2 status erpnext-ui"
```

Report each step's result. If any step fails, stop and report the error.
