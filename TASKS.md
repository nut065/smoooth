# TASKS — Premium Craft Smoothie

หลัก: ทำตามลำดับ Phase 0 → 6 ห้ามข้าม
แต่ละ task มี **DoD** (Definition of Done) ชัดเจน — ถ้าทำไม่ครบ DoD = ยังไม่เสร็จ

---

## Phase 0 — Bootstrap

- [ ] **0.1** สร้าง Next.js project (App Router, TypeScript, Tailwind)
  - DoD: `npm run dev` เปิดหน้าแรกได้บน localhost
- [ ] **0.2** ตั้ง Supabase project (cloud) + เก็บ env ใน `.env.local`
  - DoD: เชื่อมต่อ Supabase client ได้ทั้งฝั่ง server + client
- [ ] **0.3** ติดตั้ง + init LIFF SDK ใน layout
  - DoD: เปิดในเบราว์เซอร์ปกติยัง render ได้ (ไม่ break เวลา dev)
- [ ] **0.4** ติดตั้ง GSAP + ทำ `lib/gsap/index.ts` เป็น single import point
  - DoD: animate fade-in ได้ 1 จุดทดสอบ
- [ ] **0.5** วาง folder structure ตาม `PLAN.md` ส่วนที่ 1
  - DoD: folder ครบ มี README สั้น ๆ ในแต่ละ folder บอกว่าใช้ทำอะไร

---

## Phase 1 — Database Schema + RPC

- [ ] **1.1** เขียน migration สร้าง 6 ตารางตามสเปก (`materials`, `menus`, `bom`, `addons`, `profiles`, `orders`)
  - DoD: `supabase db push` สำเร็จ + check constraint ตรง spec (status enum, unit g/ml)
- [ ] **1.2** สร้าง RPC `get_menu_availability(menu_id uuid) returns boolean`
  - DoD: คืน false ทันทีถ้า BOM แม้แค่ 1 row ที่ stock < required
- [ ] **1.3** สร้าง RPC `approve_order(order_id uuid)` — atomic deduction
  - DoD: หัก stock ทั้ง BOM + addons ใน transaction, ติดลบ → ROLLBACK + raise
  - ✅ test: approve order ที่ stock พอ → stock ลดถูกต้อง
  - ✅ test: approve order ที่ stock ไม่พอ → fail ทั้งก้อน, stock ไม่ขยับ
- [ ] **1.4** สร้าง RLS policies
  - DoD: customer อ่าน/แก้ได้แค่ orders ของตัวเอง, admin role อ่าน/เขียนได้หมด
- [ ] **1.5** Seed ข้อมูลตัวอย่าง (5 เมนู, 8 วัตถุดิบ, 3 add-ons)
  - DoD: ใช้ในการ dev ได้ทันที

---

## Phase 2 — Customer Flow

- [ ] **2.1** หน้าเมนู `/` — server component, ดึงด้วย `get_menu_availability`
  - DoD: เมนูที่ stock ไม่พอแสดงเป็น disabled card (greyed out + label "หมด")
- [ ] **2.2** Component `MenuCard` — รับ props เฉพาะที่ใช้ (ISP)
  - DoD: ไม่ import Supabase, ไม่มี business logic
- [ ] **2.3** หน้ารายละเอียดเมนู + เลือก add-on
  - DoD: ราคารวม update real-time, micro-interaction บน add-on toggle
- [ ] **2.4** Cart + checkout flow — เก็บใน React state, persist ใน localStorage
  - DoD: refresh แล้ว cart ไม่หาย
- [ ] **2.5** สร้าง order (status `Pending`) + แสดง PromptPay QR + อัปโหลดสลิป
  - DoD: สลิปขึ้น Supabase Storage, order มี ref ไปไฟล์
- [ ] **2.6** หน้า "ออเดอร์ของฉัน" — ใช้ Supabase Realtime subscribe สถานะ
  - DoD: status เปลี่ยนใน DB → UI update ภายใน 2 วิ โดยไม่ refresh

---

## Phase 3 — Admin Panel

- [ ] **3.1** Auth admin (Supabase Auth + role check) — แยก route group `/admin`
  - DoD: non-admin เข้าไม่ได้ ทั้งฝั่ง UI + API
- [ ] **3.2** Queue หน้า admin: รายการ orders เรียงตาม `created_at`
  - DoD: filter ตาม status ได้, realtime update เมื่อมีออเดอร์ใหม่
- [ ] **3.3** ปุ่ม Approve → เรียก `approve_order` RPC
  - DoD: stock ไม่พอ → toast error + order ยัง Pending
- [ ] **3.4** อัปโหลด video proof (Speed x2) ต่อ order
  - DoD: client-side compress ก่อน upload, แสดง progress, set `video_proof_url`
- [ ] **3.5** ปุ่มเลื่อนสถานะ Blending → Ready → Completed
  - DoD: state machine บังคับลำดับ (ห้ามข้าม)
- [ ] **3.6** หน้า materials — ดูสต็อก + เติม
  - DoD: form เติมสต็อก, log การเติมใน table `material_logs` (ถ้าจะมี)

---

## Phase 4 — Engagement Loop

- [ ] **4.1** หน้า Order Detail ลูกค้า — แสดงวิดีโอเมื่อ status `Ready`/`Completed`
  - DoD: วิดีโอ autoplay (muted) ใน LIFF
- [ ] **4.2** GSAP `onComplete` trigger → reveal review form
  - DoD: form fade-in นุ่ม, ก่อนวิดีโอจบไม่เห็น form
- [ ] **4.3** Submit review (1-5 + comment) → set `review_score`, `review_comment`
  - DoD: หลัง submit แสดง promo code (random หรือ fixed ก็ได้ในเฟสนี้)
- [ ] **4.4** ป้องกัน double submit
  - DoD: ถ้า `review_score` มีแล้ว ไม่แสดง form อีก

---

## Phase 5 — Cleanup Edge Function

- [ ] **5.1** เขียน Edge Function `cleanup-videos`
  - Logic: SELECT orders ที่ `status='Completed'` AND `created_at < now() - 7 days` AND `review_score IS NULL`
  - DoD: ลบไฟล์จาก Storage + set `video_proof_url=NULL` ในธุรกรรมเดียว
  - DoD: idempotent — รันซ้ำไม่พัง, ไม่มี side effect
- [ ] **5.2** ตั้ง `pg_cron` ให้รันวันละครั้ง (เช่น 03:00 ICT)
  - DoD: เห็น log การรันใน Supabase
- [ ] **5.3** Dry-run mode (env var) สำหรับเทสต์
  - DoD: log ว่าจะลบอะไรบ้าง โดยไม่ลบจริง

---

## Phase 6 — Polish

- [ ] **6.1** GSAP staggered reveal บน menu list
  - DoD: ดูบนมือถือแล้วลื่น 60fps, ไม่ janky
- [ ] **6.2** Smooth transitions ทุกการคลิก (สเปกเน้น)
  - DoD: ไม่มี state pop ทันทีโดยไม่มี transition
- [ ] **6.3** Mobile QA — ทดสอบใน LIFF webview จริงบนมือถือ
  - DoD: customer flow ครบ ไม่มี layout แตก, touch target ≥44px
- [ ] **6.4** Lighthouse mobile score ≥ 85 (Performance + Accessibility)
  - DoD: เห็น report
- [ ] **6.5** README — วิธี setup + deploy + env vars
  - DoD: คนอื่นมาทำต่อได้โดยไม่ต้องถาม

---

## Cross-cutting checks (ทำตลอด ไม่ใช่ทำตอนจบ)

- ทุก PR ตอบได้ว่า "อันนี้ละเมิด SRP ไหม?" — ถ้าใช่ refactor ก่อน merge
- ทุก feature ใหม่ถามตัวเอง: "นี่ KISS หรือเปล่า? ใช้ของที่มีอยู่แล้วได้ไหม?"
- Domain logic เปลี่ยน → update test ใน `lib/domain/__tests__/` ก่อน
- Schema เปลี่ยน → migration ใหม่เสมอ ห้ามแก้ migration เก่าที่ push แล้ว
