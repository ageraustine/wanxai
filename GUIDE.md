# Wanx AI — Deployment Guide

A static site: `index.html`, `styles.css`, `script.js`. No build step, no dependencies.

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Wanx AI site"
git branch -M main
git remote add origin https://github.com/<your-org-or-username>/<repo-name>.git
git push -u origin main
```

## 2. Turn on GitHub Pages

In the repo: **Settings → Pages**. Under "Build and deployment", set Source to
"Deploy from a branch", pick the `main` branch and `/ (root)` folder, then **Save**.

Your site is now live at `https://<your-org-or-username>.github.io/<repo-name>/`.
That URL works immediately — the steps below are only needed once you want your own
domain (e.g. `wanxai.com`) instead of that one.

## 3. Point your GoDaddy domain at GitHub Pages

Two options depending on whether you want the bare domain (`wanxai.com`) or a
subdomain (`www.wanxai.com`) to be the main address. Most sites do both, with one
redirecting to the other — GitHub Pages handles that automatically once both are set.

### In your GitHub repo

Settings → Pages → "Custom domain" → enter your domain (e.g. `wanxai.com`) → Save.
This creates a `CNAME` file in your repo — don't delete it. Leave "Enforce HTTPS"
checked once it becomes available (can take a few minutes after DNS propagates).

### In GoDaddy (DNS Management for your domain)

Add these records. GoDaddy may already have default `A` or `CNAME` records for `@`
and `www` — edit or delete those first so there's no conflict.

**For the bare domain (`wanxai.com`) — four A records, all with host `@`:**

| Type | Name | Value | TTL |
|---|---|---|---|
| A | @ | 185.199.108.153 | 600 |
| A | @ | 185.199.109.153 | 600 |
| A | @ | 185.199.110.153 | 600 |
| A | @ | 185.199.111.153 | 600 |

**For the `www` subdomain — one CNAME record:**

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | www | `<your-org-or-username>.github.io` | 600 |

(These four IPs are GitHub Pages' standard addresses — they're the same for every
GitHub Pages site, not specific to this repo.)

### Wait for propagation

DNS changes usually take 15 minutes to a few hours to fully propagate (occasionally
up to 24–48 hours). You can check status with `dig wanxai.com` or a site like
whatsmydns.net. Once it resolves, GitHub Pages will issue an HTTPS certificate for
the domain automatically — no action needed beyond checking "Enforce HTTPS" in
Settings → Pages.

## Editing content

- **Copy**: edit directly in `index.html` — services are under `#services`, case
  studies under `#work`, the process under `#approach`.
- **Colors/type**: CSS variables at the top of `styles.css` (`:root { ... }`).
- **Contact info**: update the `mailto:` and `wa.me` links in the `#contact` section
  once you have dedicated company email/WhatsApp rather than founder-personal ones.
