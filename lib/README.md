# lib/

Module ที่ใช้ร่วมกันทั่ว app — ทุกตัว single-responsibility ตาม PLAN.md

| Folder | หน้าที่ | ห้ามทำ |
|---|---|---|
| `supabase/` | สร้าง Supabase client (browser, server, admin) | ใส่ business logic |
| `liff/` | init LIFF + auth wrapper | เก็บ user state ที่อื่น |
| `domain/` | business rules (availability, approval) — เรียก RPC | คำนวณสต็อก/ราคาฝั่ง JS |
| `gsap/` | animation primitives reusable | scatter `import gsap` ในทุกไฟล์ |
