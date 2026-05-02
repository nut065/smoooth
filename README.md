# 🌿 Premium Craft Smoothie

Mobile-first order system for a craft smoothie shop selling 15–20 cups/day.
Runs inside LINE as a LIFF mini-app; admin panel at `/admin`.

**Stack:** Next.js (App Router) · Tailwind CSS · GSAP · Supabase (DB + Realtime + Storage + Edge Functions) · LINE LIFF · PromptPay QR + manual slip upload

---

## Quick start

### 1 — Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | `brew install node` |
| Supabase CLI | ≥ 2 | `brew install supabase/tap/supabase` |
| Docker Desktop | any | [docker.com](https://www.docker.com/products/docker-desktop/) |

### 2 — Clone & install

```bash
git clone <repo-url> smoothies && cd smoothies
npm install
```

### 3 — Start local Supabase

```bash
supabase start          # starts Postgres + API + Storage on :54321
supabase db push        # applies all migrations in supabase/migrations/
supabase db seed        # loads seed data (menus, materials, addons)
```

After `supabase start`, copy the printed keys into `.env.local`:

```bash
cp .env.local.example .env.local
# then fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY from `supabase status`
```

### 4 — Run the app

```bash
npm run dev             # http://localhost:3000
```

Customer flow: `/` → menu list → `/menu/:id` → cart → checkout (PromptPay QR + slip upload)
Admin panel: `/admin` (PIN protected — default `1234` in dev)

---

## Environment variables

All required for production; in development the local Supabase values work.

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Anon/publishable key — safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS. **Never** put in `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_LIFF_ID` | Client | LINE LIFF app ID (`1234567890-xxxxxxxx`). Leave blank for browser-only dev |
| `NEXT_PUBLIC_PROMPTPAY_QR_URL` | Client | Public URL of the PromptPay QR image in Storage |
| `ADMIN_PIN` | Server only | PIN for the admin panel (default `"1234"` if unset — **change in production**) |

> Run `supabase status` after every `supabase start` restart — local keys change each time.

### Edge Function secrets (production only)

Set via `supabase secrets set` or the Supabase dashboard:

| Secret | Used by |
|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected into every Edge Function |
| `app.cleanup_fn_url` | pg_cron → `cleanup-videos` invocation URL |
| `app.service_role_key` | pg_cron → `cleanup-videos` auth header |

See `supabase/snippets/configure_cleanup.sql` for the one-time setup SQL.

---

## Database

Schema lives in `supabase/migrations/`. Apply in order:

| File | What it does |
|------|-------------|
| `20260429000001_init_schema.sql` | 6 tables: `materials`, `menus`, `bom`, `addons`, `profiles`, `orders` |
| `20260429000002_rpc.sql` | `get_menu_availability()`, `approve_order()` RPCs |
| `20260429000003_rls.sql` | Row-level security policies |
| `20260429000004_storage.sql` | Storage buckets: `slip-images`, `video-proofs` |
| `20260430000001_cron_cleanup.sql` | pg_cron daily cleanup job |

### Key invariants — do not break these

**1. Menu availability is computed from stock, never stored.**
A menu is available iff every BOM row satisfies `current_stock ≥ quantity_required`.
Computed server-side via `get_menu_availability()` RPC. Never trust the client.

**2. Stock deduction fires on Approve, not on order creation.**
`approve_order(order_id)` deducts all BOM rows + selected add-ons atomically.
If any material would go negative → the whole transaction rolls back.

**3. Videos auto-delete after 7 days (if no review score).**
Conditions: `status = 'Completed'` AND `created_at < now() - 7 days` AND `review_score IS NULL`.
Both Storage file deletion AND `video_proof_url = NULL` must happen together — see Edge Function below.

---

## Edge Functions

### `cleanup-videos` (daily at 03:00 ICT)

Deletes old proof videos from Storage and nullifies `video_proof_url` in DB.

```bash
# Invoke locally
supabase functions serve cleanup-videos
curl -i http://localhost:54321/functions/v1/cleanup-videos \
  -H "apikey: $(supabase status --json | jq -r .ANON_KEY)" \
  -H "Authorization: Bearer $(supabase status --json | jq -r .SERVICE_ROLE_KEY)"

# Dry-run (SELECT only, no deletions)
curl ... "http://localhost:54321/functions/v1/cleanup-videos?dry_run=true"
```

Deploy to production:

```bash
supabase functions deploy cleanup-videos
```

---

## Project structure

```
app/
  (customer)/          # LIFF flows (menu list, detail, cart, orders, review)
  (admin)/             # Admin panel (order queue, video upload, stock)
  api/admin/           # Server-side admin API routes (auth, approve, video)
  globals.css          # Tailwind theme + View Transition animations
  layout.tsx           # Root layout (LIFF + Cart providers, viewport)

components/            # Pure UI — no Supabase calls, no business logic
  MenuCard.tsx         # Menu card with ViewTransition shared-element morph
  MenuGrid.tsx         # Staggered GSAP reveal grid
  CartIconButton.tsx   # Header cart icon + badge
  AddonToggle.tsx      # Add-on pill with drop animation

lib/
  supabase/            # Supabase client factories (browser / server / admin)
  liff/                # LINE LIFF init + auth context
  domain/              # Business logic: availability, order types, menus
  gsap/                # GSAP primitives (fadeInUp, staggeredReveal)
  cart/                # Cart state (React context + localStorage)

supabase/
  migrations/          # SQL schema, RPCs, RLS, storage, cron
  functions/           # Deno Edge Functions
  snippets/            # One-off SQL (run in Supabase dashboard, not via CLI)
```

---

## Animation contract

- **Menu list:** `staggeredReveal()` on mount (skipped when `document.hidden` to avoid GSAP freeze in LINE WebView background-open)
- **Add-on toggle:** pill drop animation into the cup image
- **Add to cart:** cinematic flying cup → cart overlay
- **Page transitions:** React 19 ViewTransition — shared-element morph (card hero ↔ detail hero) + slide left/right for forward/back navigation
- **Review form reveal:** GSAP `onComplete` on video playback — do **not** replace with a button-only flow; this is the engagement loop

---

## Admin panel

Access: `/admin` → enter PIN → order queue

Workflow per order:

1. Customer places order (status `Pending`) + uploads PromptPay slip
2. Admin reviews slip → **Approve** → status `Blending`, stock deducted atomically
3. Admin uploads Speed ×2 proof video → status `Ready`
4. Customer watches video + submits star review → status `Completed`
5. After 7 days with no review score → video auto-deleted by Edge Function

---

## Deployment

### Vercel (frontend)

```bash
vercel deploy
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

### Supabase (backend)

```bash
# Link to cloud project
supabase link --project-ref <project-ref>

# Push schema
supabase db push

# Deploy Edge Functions
supabase functions deploy cleanup-videos

# Set pg_cron secrets (see supabase/snippets/configure_cleanup.sql)
```

Upload the PromptPay QR image to Supabase Storage → `public` bucket, then set `NEXT_PUBLIC_PROMPTPAY_QR_URL` to the public URL.

---

## LINE LIFF setup

1. Create a LINE Login channel at [developers.line.biz](https://developers.line.biz)
2. Add a LIFF app with type **Full** and your production URL as the endpoint
3. Copy the LIFF ID (`1234567890-xxxxxxxx`) → `NEXT_PUBLIC_LIFF_ID`
4. Test in LINE by opening the LIFF URL from a LINE chat

In browser-only dev mode (LIFF ID blank), the app renders without LINE auth — all customer features work except `liff.getProfile()`.

---

## Lighthouse scores (production proxy via dev build)

| Category | Score |
|----------|-------|
| Performance | 93 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

> Dev-mode scores for Performance are lower due to unminified JS and source maps.
> Run `npm run build && npm start` for production-accurate results.
