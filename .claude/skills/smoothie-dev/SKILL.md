---
name: smoothie-dev
description: Use this skill for any task on the Premium Craft Smoothie Management System — a Next.js + Supabase + LINE LIFF web app for a craft smoothie shop (15–20 cups/day). Triggers when working with menus, BOM-based inventory deduction, order flow (Pending/Blending/Ready/Completed), Speed x2 video proof uploads, GSAP animations, LIFF auth, PromptPay slip uploads, the 7-day video auto-deletion job, Supabase Edge Functions/RPCs, or anything touching the schema (Materials, Menus, BOM, Addons, Profiles, Orders). Also triggers on Thai-language requests about "สมูทตี้", "ออเดอร์", "หักสต็อก", "BOM", or "วิดีโอรีวิว" within this project.
---

# Premium Craft Smoothie — Development Skill

This skill encodes the project-specific contract for the Premium Craft Smoothie system. Read the full spec at `/Users/jupiter/Documents/Premium_Smoothie_Project_Spec.md` before any non-trivial change.

## Stack — non-negotiable choices

- **Frontend:** Next.js (App Router) + Tailwind CSS + GSAP. No other animation libs.
- **Backend/DB:** Supabase (PostgreSQL + Realtime + Storage + Edge Functions). No separate API server.
- **Auth/Frontend shell:** LINE LIFF. The app runs inside LINE — design for mobile webview first.
- **Payment:** Manual PromptPay QR + slip image upload. No payment gateway.

If a request implies a different stack (Firebase, Stripe, Framer Motion, etc.), stop and confirm — it's almost certainly wrong for this project.

## Schema invariants

Tables: `materials`, `menus`, `bom`, `addons`, `profiles`, `orders`. Field names and types come from the spec — do not rename or extend without asking.

- `materials.unit` is `'g'` or `'ml'` only. `current_stock` is the **real** remaining amount, not a display value.
- `bom` is the join between `menus` and `materials` with `quantity_required` per single cup.
- `addons.material_id` + `quantity_per_serving` lets add-ons deduct from the same materials pool — treat add-ons as additional BOM rows at order time.
- `orders.status` is one of `Pending | Blending | Ready | Completed`. No other values.
- `orders.video_proof_url` and `orders.review_score` may both be NULL. The auto-deletion job depends on this.

## Three pieces of business logic that must not drift

### 1. Menu availability is computed, not stored
A menu is **available** iff every BOM row satisfies `materials.current_stock >= bom.quantity_required` for at least 1 cup. Do this server-side (RPC or view) — never trust the client. Disable the menu card immediately when stock falls below the threshold.

### 2. Stock deduction fires on Approve, not on order creation
When an admin approves an order, deduct stock atomically for every menu line **and** every selected add-on, in a single transaction (Supabase RPC or trigger). If any material would go negative, abort the whole approval. Order creation alone does **not** touch `current_stock`.

### 3. The 7-day video auto-deletion rule
A scheduled Edge Function deletes the video when **all** of:
- `status = 'Completed'`
- `created_at < now() - interval '7 days'`
- `review_score IS NULL`

It must (a) delete the file from Supabase Storage and (b) set `video_proof_url = NULL`. Both, or neither. If a row has a review score, the video is kept regardless of age.

## UX contract

- **Tone:** Minimalist, premium, white background, subtle shadow, fruit photography.
- **GSAP usage:** smooth scroll + staggered reveal on menu list; micro-interaction on add-on selection; **the review form is revealed by a GSAP `onComplete` trigger when the proof video finishes playing** — this is the engagement loop, don't replace it with a button-only flow.
- All touch targets are LIFF-mobile sized. Test in a narrow viewport before claiming done.
- Every interaction has a soft transition. No instant pops.

## Storage discipline

The shop generates one Speed x2 video per order. Storage cost is the main ongoing expense — that is why the auto-deletion job exists. When adding any new file upload:
- Compress client-side before upload (the spec calls for this — don't skip it).
- Store under a path that includes `order_id` so cleanup is straightforward.
- Never upload raw originals "just in case."

## Things to push back on

- Adding a queue/worker service — Supabase Edge Functions + Cron are sufficient for 15–20 cups/day.
- Real-time order tracking maps, ETA prediction, ML — out of scope.
- Replacing manual slip upload with a payment gateway — explicitly out of scope; the shop wants manual review.
- Storing video forever or moving to a CDN — fights the storage-optimization goal.

## When writing code

- SQL/RPC: prefer one well-tested function over many small ones. Approval + deduction is one transaction.
- Next.js: server components for menu listing (so availability is computed server-side); client components only where GSAP or LIFF SDK is needed.
- Edge Functions: keep them small and idempotent — cron can re-fire.
- Comments: only when the *why* is non-obvious (e.g. why a material check happens twice, why a video is kept past 7 days).

## Before reporting a task done

- For UI work: open it in a mobile-width viewport and click through the affected flow.
- For stock/order logic: walk through one full order — create → approve → check `current_stock` deltas → mark completed.
- For the cleanup job: dry-run the SELECT before wiring the DELETE.
