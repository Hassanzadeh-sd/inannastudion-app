# استودیو اینانا — Exhibition Lead App

Persian RTL Android tablet app (Expo SDK 57) for the استودیو اینانا exhibition booth:
visitors enter their mobile number on a kiosk screen; staff rate leads 1-5, plan
follow-ups, show QR business cards, and export/backup everything.

## Layout

- App: Expo + expo-router, source in `src/` (routes in `src/app/`).
- `server/`: tiny Express + better-sqlite3 push-backup API, deployed on
  `personal_qrcow_cloudzy_02` at `/opt/leadsync` (systemd unit `leadsync`),
  exposed at `https://opendevtalk.com/lead-api` (Cloudflare TLS, HTTP origin).
  Bearer token: on the VPS in `/etc/leadsync.env`; local copy in `server/.token`
  (gitignored). Server DB: `/var/lib/leadsync/leads.db`.
- Employee web panel: `https://opendevtalk.com/lead-api/admin`, mobile-friendly
  Persian page where employees log in with a shared password (VPS
  `/etc/leadsync.env` ADMIN_PASSWORD; local copy `server/.admin-password`,
  gitignored) and complete customer info (name, rating, status, follow-up,
  note) from any phone browser. Session cookie lasts 30 days. Web edits live on
  the server only; the tablet keeps its own copy (tablet re-edits win on later
  sync).
- Employee mode (حالت همکار): switch in app Settings; the customers tab then
  reads/edits the shared server list via the admin API (Bearer = sync token),
  30 s auto-refresh, delete hidden. Kiosk capture stays offline-first local on
  every device regardless.
- SMS verification (کلوپ مشتریان): Kavenegar verify-lookup, configured in the
  app's Settings tab (API key + template). Unconfigured or failed SMS → the
  kiosk skips verification and still saves the number.

## Before the exhibition

1. Edit `src/constants/team.ts`: real names, roles, numbers, email for the QR
   business cards and team directory.
2. First app launch asks to set a 4-digit staff PIN.
3. In Settings tab enter server URL `https://opendevtalk.com/lead-api` and the
   token from `server/.token`, then tap همگام‌سازی to verify.
4. Replace `assets/images/` icon/splash with real brand art when available.

## Daily development (Iran network notes)

- npm registry works directly; no proxy needed for installs.
- Dev loop: install **Expo Go** (must match SDK 57) on the tablet once
  (download APK via proxied browser from https://expo.dev/go), then:

  ```bash
  npx expo start --lan
  ```

  Tablet on the same Wi-Fi scans the QR; Metro traffic is pure LAN.
- Type check: `npx tsc --noEmit`. Bundle check: `npx expo export --platform android`.

## Release APK (sideload, no Play Store)

EAS cloud build; expo.dev needs the proxy:

```bash
export HTTPS_PROXY=http://127.0.0.1:2080 HTTP_PROXY=http://127.0.0.1:2080
npx eas-cli login          # once
npx eas-cli build -p android --profile production
```

`eas.json` production profile uses `buildType: "apk"` → downloadable,
sideloadable APK. Install on the Redmi Pad via USB copy or by downloading in
the tablet browser (allow "install unknown apps").

Local-build fallback (only if EAS is unusable): install `openjdk-17-jdk` and
Android cmdline-tools; run `sdkmanager` and Gradle through the 127.0.0.1:2080
proxy (`~/.gradle/gradle.properties` → `systemProp.https.proxyHost/Port`), then
`npx expo prebuild -p android && cd android && ./gradlew assembleRelease`.

## Kiosk hardening on the tablet (MIUI/HyperOS)

- In-app: back button swallowed, nav bar hidden, keep-awake, staff area behind
  PIN. Staff entry: tap the top corner (start side) 5 times within 3 seconds.
- OS level: enable **App pinning** (Settings → Passwords & security), then pin
  the app from Recents; unpinning requires the device PIN. Also exclude the app
  from battery optimization.

## Server ops

```bash
ssh personal_qrcow_cloudzy_02
systemctl status leadsync            # service
curl -s localhost:8787/health        # local health
# download all leads as Excel-friendly CSV (browser works too, ?token=…):
curl -H "Authorization: Bearer $TOKEN" https://opendevtalk.com/lead-api/leads.csv
```

Redeploy after editing `server/src/server.js`:

```bash
scp server/src/server.js personal_qrcow_cloudzy_02:/opt/leadsync/src/server.js
ssh personal_qrcow_cloudzy_02 systemctl restart leadsync
```
