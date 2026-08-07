#!/bin/sh
# Nightly snapshot of the leads DB; keeps the newest 14 copies.
set -e
mkdir -p /var/lib/leadsync/backups
node -e "require('/opt/leadsync/node_modules/better-sqlite3')('/var/lib/leadsync/leads.db', { readonly: true }).backup('/var/lib/leadsync/backups/leads-$(date +%F).db').then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); })"
ls -1t /var/lib/leadsync/backups/leads-*.db 2>/dev/null | tail -n +15 | xargs -r rm --
