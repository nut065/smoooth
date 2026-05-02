-- Storage buckets for payment slips and video proofs.
-- All uploads go through server actions using service-role key — no direct
-- client uploads, so no permissive storage policies needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-slips', 'payment-slips', false, 5242880,  array['image/jpeg','image/png','image/webp']),
  ('video-proofs',  'video-proofs',  false, 52428800, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do nothing;
