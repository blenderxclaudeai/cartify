
-- Update photo_category enum: rename hair → upper_body, hands_wrist → lifestyle
ALTER TYPE public.photo_category RENAME VALUE 'hair' TO 'upper_body';
ALTER TYPE public.photo_category RENAME VALUE 'hands_wrist' TO 'lifestyle';

-- Add missing storage read policy (upload/update/delete may already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own photos' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can read own photos" ON storage.objects FOR SELECT USING (bucket_id = ''profile-photos'' AND (auth.uid()::text) = (storage.foldername(name))[1])';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own photos' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own photos" ON storage.objects FOR UPDATE USING (bucket_id = ''profile-photos'' AND (auth.uid()::text) = (storage.foldername(name))[1])';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own photos' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = ''profile-photos'' AND (auth.uid()::text) = (storage.foldername(name))[1])';
  END IF;
END $$;
