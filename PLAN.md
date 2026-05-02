# Premium Craft Smoothie — Implementation Plan

อ้างอิงสเปก: `~/Documents/Premium_Smoothie_Project_Spec.md`

## 1. Repo strategy — single repo, ชัดเจนเป็น module

ขนาดงาน 15–20 แก้ว/วัน เป็น side hustle → **KISS: หนึ่ง repo**
แยก folder เป็น module ตามขอบเขตความรับผิดชอบ → **SOLID (SRP) ที่ระดับ module ก็พอ**

```
smoothies/
├── app/                    # Next.js App Router (customer + admin routes)
│   ├── (customer)/         # LIFF flows: menu, cart, order detail, review
│   ├── admin/              # Admin Panel: orders queue, video upload, stock
│   └── api/                # เฉพาะที่ Edge Function ทำไม่ได้
├── components/             # UI ล้วน — ไม่มี business logic
├── lib/
│   ├── supabase/           # client + server clients
│   ├── liff/               # LIFF init + auth wrapper
│   ├── domain/             # business rules (menu availability, BOM calc)
│   └── gsap/               # animation primitives ที่ reuse ได้
├── supabase/
│   ├── migrations/         # SQL schema + RPC + trigger
│   └── functions/          # Edge Functions (cleanup-videos, ...)
└── public/
```

**ทำไมไม่แยก repo:**
- Frontend, admin, edge function ใช้ schema/types เดียวกัน → แยก repo = ต้อง sync types ตลอด ไม่คุ้ม
- Deploy ครั้งเดียวคือเสร็จ (Vercel + Supabase CLI)
- ถ้าวันไหน admin โตจน UX ปนกันลำบาก ค่อยแยกตอนนั้น (YAGNI)

## 2. SOLID ลงในโปรเจกต์นี้ยังไง

ไม่ใช่ทุกหลักจะมีน้ำหนักเท่ากัน — เลือกใช้ที่จ่ายค่าได้

| หลัก | ใช้ตรงไหน | ตัวอย่างรูปธรรม |
|---|---|---|
| **S**RP | แยก UI / domain / data access | `components/MenuCard.tsx` แสดงผลอย่างเดียว, `lib/domain/availability.ts` ตัดสินว่าเมนูทำได้ไหม, `lib/supabase/menus.ts` ดึงข้อมูล |
| **O**CP | เพิ่ม add-on ใหม่ไม่ต้องแก้ code | add-on อยู่ในตาราง `addons` + `material_id` → เพิ่มแถวใน DB ก็พอ ไม่ต้อง deploy |
| **L**SP | ไม่จำเป็นต้องบังคับใช้ — ไม่มี class hierarchy | – |
| **I**SP | type ของ component รับเฉพาะ field ที่ใช้ | `MenuCard` รับ `{name, price, image, available}` ไม่ใช่ `Menu` ทั้งก้อน |
| **D**IP | UI เรียก function จาก `lib/domain` ไม่เรียก Supabase ตรง ๆ | `getAvailableMenus()` ใน domain → เปลี่ยน data source ภายหลังได้ |

## 3. KISS — สิ่งที่ "ไม่ทำ"

- ❌ ไม่ใส่ Redux / Zustand — React state + Supabase realtime พอ
- ❌ ไม่ทำ generic CMS — admin panel เป็น form ตรง ๆ ต่อ table
- ❌ ไม่ทำ multi-tenant — มีร้านเดียว
- ❌ ไม่ทำ unit test ครบทุก component — เขียนเฉพาะ `lib/domain` (logic ที่พังแล้วเสียเงินจริง)
- ❌ ไม่ optimize image pipeline เอง — ใช้ `next/image` + Supabase transform
- ❌ ไม่ทำ queue/worker — Supabase pg_cron เรียก Edge Function ก็พอ
- ❌ ไม่บีบอัดวิดีโอ server-side — ทำ client-side ก่อนอัปโหลด (สเปกระบุ)

## 4. Module boundaries (จุดที่จะเขียนผิดง่ายสุด)

### `lib/domain/availability.ts`
หน้าที่เดียว: รับ `menu_id` คืน `available: boolean`
- คำนวณจาก BOM × current_stock
- **ทำใน SQL** (RPC `get_menu_availability`) ไม่ใช่ JS — กัน race และเร็วกว่า

### `lib/domain/order-approval.ts`
หน้าที่เดียว: approve order = หักสต็อก
- เรียก RPC `approve_order(order_id)` ใน transaction
- material ติดลบ → ROLLBACK ทั้ง transaction → return error
- ห้ามแก้ stock ที่อื่นเด็ดขาด

### `supabase/functions/cleanup-videos/`
หน้าที่เดียว: ลบวิดีโอที่ครบเงื่อนไข 3 ข้อ
- idempotent: รันซ้ำต้องไม่พัง
- ลบไฟล์ → set `video_proof_url = NULL` ใน transaction เดียวกัน

### `app/(customer)/orders/[id]/page.tsx`
- GSAP `onComplete` ของ video → trigger review form
- ตรงนี้ห้ามแทนด้วยปุ่ม "เขียนรีวิว" — engagement loop หลักของธุรกิจ

## 5. Phase ตามสเปก → ลำดับงาน

ดู `TASKS.md` สำหรับ checklist ละเอียด

1. **Phase 0** — Bootstrap: Next.js + Supabase + LIFF dev setup
2. **Phase 1** — DB schema + RPC (availability + approve)
3. **Phase 2** — Customer flow: menu → cart → order → slip upload
4. **Phase 3** — Admin: queue + approve + video upload
5. **Phase 4** — Engagement: video player + review form (GSAP trigger)
6. **Phase 5** — Cleanup Edge Function + cron
7. **Phase 6** — Polish: GSAP staggered reveal, micro-interactions, mobile QA

ทำตามลำดับ ไม่ข้าม — Phase หลังพึ่ง Phase ก่อนหน้าทุกอัน

## 6. Model selection

| Phase | งานหลัก | Model |
|---|---|---|
| 0 Bootstrap | scaffold, tooling decisions | `claude-opus-4-7` |
| 1 DB Schema + RPC | atomic invariants, security | `claude-opus-4-7` |
| 2 Customer UI | server component, form, realtime | `claude-sonnet-4-6` |
| 3 Admin Panel | CRUD queue, video upload | `claude-sonnet-4-6` |
| 4 Engagement | GSAP onComplete → review form | `claude-sonnet-4-6` |
| 5 Edge Function | cleanup-videos ~50 บรรทัด | `claude-haiku-4-5` |
| 6 Polish | animation tweak, mobile QA | `claude-sonnet-4-6` |

**กลับมา Opus 4.7 เมื่อ:**
- ติด bug หา root cause ไม่เจอ > 2 รอบ
- ตัดสินใจสถาปัตยกรรมใหม่ (เช่น LIFF auth ↔ Supabase auth)
- Schema migration ที่กระทบหลายโมดูล
- Security review ก่อน deploy production

**เปิด `/fast`** บน Opus 4.6 เมื่อต้องการ iterate UI เร็ว ๆ โดยไม่ลด capability
