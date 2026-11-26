# Hostinger Deployment Guide (`wa.jeniferdecor.in`)

## 1. Hostinger Server & Database Details
- **Domain:** `https://wa.jeniferdecor.in`
- **Document Root:** `/home/u943120118/domains/jeniferdecor.in/public_html/wa`
- **PHP Version:** `8.4`
- **SSH Command:** `ssh -p 65002 u943120118@147.93.101.28`
- **MySQL Database:** `u943120118_wa_saas`
- **MySQL Username:** `u943120118_wa_saas`
- **MySQL Host (on-server):** `127.0.0.1` (or `srv1835.hstgr.io`, port `3306`)

---

## 2. First-Time Server Setup (via SSH)
1. Upload `.env.production` to the server as `.env`:
   `/home/u943120118/domains/jeniferdecor.in/public_html/wa/.env`
2. Fill in your Meta credentials in `.env`:
   - `META_APP_ID`
   - `META_APP_SECRET`
   - `META_WEBHOOK_VERIFY_TOKEN`
3. Connect via SSH:
   ```bash
   ssh -p 65002 u943120118@147.93.101.28
   cd /home/u943120118/domains/jeniferdecor.in/public_html/wa
   chmod +x deploy-hostinger.sh
   ./deploy-hostinger.sh
   ```

---

## 3. GitHub Actions Auto-Deploy Setup
Because Hostinger hPanel's built-in Git UI is disabled in client-managing mode, [.github/workflows/deploy-hostinger.yml](.github/workflows/deploy-hostinger.yml) builds Vite assets + Composer dependencies on GitHub and syncs directly to Hostinger over SSH on every push to `main`.

Add these **Repository Secrets** in GitHub (**Settings → Secrets and variables → Actions**):
- `HOSTINGER_SSH_HOST`: `147.93.101.28`
- `HOSTINGER_SSH_PORT`: `65002`
- `HOSTINGER_SSH_USER`: `u943120118`
- `HOSTINGER_SSH_KEY`: Your private SSH key (and add the matching public key in Hostinger hPanel → **Advanced → SSH Access**)

---

## 4. Hostinger Cron Jobs (Required for Broadcasts & Scheduler)
In Hostinger hPanel → **Advanced → Cron Jobs**, add two **Custom** cron jobs running **every minute (`* * * * *`)**:

1. **Laravel Scheduler:**
   ```bash
   /usr/bin/php /home/u943120118/domains/jeniferdecor.in/public_html/wa/artisan schedule:run >> /dev/null 2>&1
   ```
2. **Queue Worker (processes webhooks, inbox & broadcasts without timing out):**
   ```bash
   /usr/bin/php /home/u943120118/domains/jeniferdecor.in/public_html/wa/artisan queue:work --queue=webhooks,inbox,broadcasts,default --stop-when-empty --max-time=50 >> /dev/null 2>&1
   ```
