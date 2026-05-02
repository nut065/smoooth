-- Make fruit-photos bucket public so customer-facing pages can display images
-- without generating signed URLs on every request.
update storage.buckets set public = true where id = 'fruit-photos';
