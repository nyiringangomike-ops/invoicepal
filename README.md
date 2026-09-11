# InvoicePal — Invoice Generator SaaS (LIVE)

A complete, deployable micro-SaaS: create professional invoices, download real
PDF files in one click, all client-side. Free/Pro freemium model with Stripe
billing. Zero backend, zero build tools — pure HTML/CSS/JS.

**Live site:** https://nyiringangomike-ops.github.io/invoicepal/
**Repo:** https://github.com/nyiringangomike-ops/invoicepal

```
index.html        — landing page (features, pricing, FAQ, testimonials)
app.html          — the invoice builder app
css/style.css     — all styling incl. print styles
js/app.js         — app logic (data, plans, PDF via jsPDF, settings)
js/landing.js     — landing page animations + exit-intent popup
favicon.svg        — brand icon
og-image.png       — social share image (1200x630)
robots.txt, sitemap.xml, 404.html — SEO essentials
```

---

## 1. Deploy it (already done)

The site is deployed and live on **GitHub Pages**:
`https://nyiringangomike-ops.github.io/invoicepal/`

To redeploy after edits: commit and push to `main` — GitHub Pages rebuilds
automatically (needs no setup; each push triggers a build).

> Note: because the repo lives at `/invoicepal` (not a username repo), the app
> runs from `https://.../invoicepal/`. Everything uses relative links, so it
> also works from a custom domain later. To move to a custom domain, add a
> `CNAME` file with your domain and set it in GitHub Pages settings.

> Uses jsPDF for real one-click PDF downloads (fallback: print-to-PDF), so it
> works on any static host with no backend.

---

## 2. Turn on billing (Stripe, ~15 minutes)

1. Create a Stripe account: https://dashboard.stripe.com/register
2. **Payments → Payment Links → Create Payment Link**.
3. Add a **Recurring** price: `$9 / month` → create a *Subscription* type.
4. Set the price name and pick a checkout branding image.
5. In **Payment links → Click after conversion**, set a **Redirect** URL to:
   ```
   https://your-site-url/app.html?upgrade=success
   ```
6. **Create link**, then copy the `checkout.stripe.com` URL.
7. Open `js/app.js` and replace the placeholder with the real URL:
   ```js
   const STRIPE_URL = '#';  // →  const STRIPE_URL = 'https://buy.stripe.com/yourlink';
   ```
8. Commit & push — GitHub Pages redeploys automatically.

Now the **Upgrade** button makes a real $9/mo purchase; after paying, customers land
back on the app unlocked (`Pro ✓`, unlimited invoices, no watermark).

> **Honesty caveat (MVP):** unlocking is honor-based (a URL param sets Pro locally,
> no server check). For a paid product, upgrade to a real backend with a Stripe
> webhook to verify payments. This MVP is a validation tool — it proves demand
> before you invest in a backend.

---

## 3. Pricing & free tier (already configured)

- **Free:** 5 invoices, full features, "Made with InvoicePal" watermark on PDFs.
- **Pro:** $9/mo — unlimited invoices, no watermark, logo, custom numbering, email
  support. (LocalStorage flag; see above.)

$9/mo is deliberately low friction. You need roughly **20–40 signups** to hit
~$200–360/mo MRR. Optimize price later using the two-tier trick below.

---

## 4. Getting customers (the actual "make money" part)

Traffic is everything. In priority order:

1. **Direct outreach / warm niche** — Offer the tool free to freelancers in one
   niche (e.g. *web designers*, *copywriters*) and ask for a testimonial.
2. **Reddit** — post your tool in r/freelance, r/webdev, r/Entrepreneur, r/SideProject
   with a real story, not an ad: *"I built a no-nonsense invoice tool because
   FreshBooks is overkill"*. Reply to people complaining about invoicing.
3. **X / Twitter** — post the landing page + a 30-second demo screen recording
   (OBS is free). Hashtags: #buildinpublic #indiehackers #freelancer.
4. **Quora / Google** — answer *"best free invoicing software"* questions linking
   your site. Search-optimize the landing page for "free invoice generator".
5. **TikTok / Shorts** — screen-record yourself creating an invoice in 30s.
   Freelancer/creator engines are huge here.
6. **Be listed** — product hunt, alternative.to, ProductHunt submission,
   free-tools curl lists (Free Summer, FREE Stuff, etc.).

### Growth loop to build
- Add "Save & send by email" via a free mailto (user's own email client).
- Add a shareable demo: `app.html?demo=1` prefilled with a sample invoice, so
  people link back to you.
- Exit-intent: when a free user reopens the page after hitting the 5-invoice cap,
  show the upgrade modal first (already implemented on limit).

---

## 5. Measure & iterate

Track with free tools:
- **GoatCounter** or **Umami** (privacy-friendly) — add one line of script.
- **Google Analytics 4** — behavioral data.
- **Stripe dashboard** — conversion, MRR, churn.

Key metrics: visitors → started-invoice → saved → upgraded. If conversion is <1%
to paid, change the free limit (3 instead of 5) or raise the watermark visibility.
If signup noise is the problem, A/B the copy.

---

## 6. Scale the revenue (dump truck checklist)

1. **Multiple products** — duplicate this stack for related tools (estimate
   generator, quote generator, timesheet→invoice). One brand, many entry points.
2. **Cost-per-action backend** — add a real Stripe webhook backend (Node/Cloudflare
   Worker) once demand is proven, to eliminate the honor-system unlock.
3. **Add email delivery** — record-keeping + "invoice viewed" notifications = the
   main reason people upgrade from free invoice tools to Pro.
4. **Late-fee automation** — automatic reminder emails on overdue invoices is the
   #1 paid feature at competitors.
5. **Sell the SaaS** — once you have traction, flip the company at
   https://acquire.com, Feasible.im, or Exitverse (small SaaS $10k–$500k range).

---

## 7. Legal & taxes (don't skip)

- Take payments via Stripe (they handle most sales-tax remittance via Stripe Tax).
- Register as a sole proprietor / LLC depending on your country.
- Save receipts. $9/mo recurring without a real company is risky in most places.
- Add a simple privacy policy + terms page (free generators exist).

---

## Files you'll likely want to change

| What | Where |
|---|---|
| Product name / brand | `index.html`, `app.html`, `README` (search "InvoicePal") |
| Invoice prefix "INV-" | `js/app.js` (`'INV-'` in `newInvoice` and `duplicateInv`) |
| Free invoice limit | `js/app.js` (`FREE_LIMIT = 5`) |
| Pro price | Stripe dashboard (Payment Link) |
| Upgrade link | `js/app.js` (`STRIPE_URL`) |
| Watermark text | `js/app.js` (`renderPrintHTML`) |

---

## Local testing

The app is fully static — just open `index.html` in any browser (double-click).
No server needed. Note: localStorage is per-origin; opening via different file
paths is still fine locally.