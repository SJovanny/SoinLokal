-- Add avatar fields to the profiles table
-- photo_url: URL of the uploaded photo (Supabase Storage)
-- avatar_type: 'photo' | 'generated' — distinguishes real photo from DiceBear avatar
-- avatar_seed: seed used to generate the DiceBear avatar (stable across regenerations)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS avatar_type text CHECK (avatar_type IN ('photo', 'generated')) DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS avatar_seed text;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
-- Anyone can read (bucket is public)
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload avatar to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
