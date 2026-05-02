# supabase/

| Folder | หน้าที่ |
|---|---|
| `migrations/` | SQL schema + RPC + trigger — รันด้วย `supabase db push` |
| `functions/` | Edge Functions (เช่น `cleanup-videos`) — `supabase functions deploy` |

ห้ามแก้ migration ที่ push ไปแล้ว — สร้างไฟล์ใหม่เสมอ
