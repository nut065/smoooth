# components/

UI ล้วน — ห้ามมี business logic, ห้าม import จาก `lib/supabase` หรือ `lib/domain`
รับเฉพาะ props ที่ใช้จริง (ISP) ไม่ใช่ entity ทั้งก้อน
