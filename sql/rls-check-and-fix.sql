-- =============================================================================
-- Vizzu - RLS (Row Level Security) Check & Fix Script
-- =============================================================================
-- Run this script in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- This script has 4 sections:
--   1. DIAGNOSTIC  - Check current RLS state on all tables
--   2. ENABLE RLS  - Enable RLS on all application tables
--   3. CREATE POLICIES - Create per-user isolation policies
--   4. STORAGE POLICIES - Create storage bucket policies
--
-- IMPORTANT: Review the diagnostic output FIRST before running the other
-- sections. You can run each section independently.
-- =============================================================================


-- =============================================================================
-- SECTION 1: DIAGNOSTIC - Check current RLS state
-- =============================================================================

-- 1a. List ALL tables and whether RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 1b. List ALL existing RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 1c. Check storage buckets
SELECT
  id,
  name,
  public,
  created_at
FROM storage.buckets
ORDER BY name;

-- 1d. List existing storage policies
SELECT
  policyname,
  tablename,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;


-- =============================================================================
-- SECTION 2: ENABLE RLS on all application tables
-- =============================================================================
-- This is safe to run even if RLS is already enabled (it is idempotent).

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_looks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.history_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creative_still_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creative_still_generations ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 3: CREATE POLICIES - Multi-tenant isolation via auth.uid()
-- =============================================================================
-- Each policy uses DROP IF EXISTS + CREATE to be idempotent.
-- Column mapping:
--   users                       -> id = auth.uid()
--   products                    -> user_id = auth.uid()
--   product_images              -> user_id = auth.uid()
--   clients                     -> user_id = auth.uid()
--   client_photos               -> user_id = auth.uid()
--   client_looks                -> user_id = auth.uid()
--   saved_models                -> user_id = auth.uid()
--   generations                 -> user_id = auth.uid()
--   history_logs                -> user_id = auth.uid()
--   creative_still_templates    -> user_id = auth.uid()
--   creative_still_generations  -> user_id = auth.uid()
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: users (PK "id" = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_delete_own" ON public.users;
CREATE POLICY "users_delete_own" ON public.users
  FOR DELETE USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- TABLE: products (user_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_select_own" ON public.products;
CREATE POLICY "products_select_own" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "products_insert_own" ON public.products;
CREATE POLICY "products_insert_own" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "products_update_own" ON public.products;
CREATE POLICY "products_update_own" ON public.products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "products_delete_own" ON public.products;
CREATE POLICY "products_delete_own" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: product_images (user_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "product_images_select_own" ON public.product_images;
CREATE POLICY "product_images_select_own" ON public.product_images
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "product_images_insert_own" ON public.product_images;
CREATE POLICY "product_images_insert_own" ON public.product_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "product_images_update_own" ON public.product_images;
CREATE POLICY "product_images_update_own" ON public.product_images
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "product_images_delete_own" ON public.product_images;
CREATE POLICY "product_images_delete_own" ON public.product_images
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: clients (user_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_select_own" ON public.clients;
CREATE POLICY "clients_select_own" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "clients_insert_own" ON public.clients;
CREATE POLICY "clients_insert_own" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "clients_update_own" ON public.clients;
CREATE POLICY "clients_update_own" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "clients_delete_own" ON public.clients;
CREATE POLICY "clients_delete_own" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: client_photos (user_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "client_photos_select_own" ON public.client_photos;
CREATE POLICY "client_photos_select_own" ON public.client_photos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_photos_insert_own" ON public.client_photos;
CREATE POLICY "client_photos_insert_own" ON public.client_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_photos_update_own" ON public.client_photos;
CREATE POLICY "client_photos_update_own" ON public.client_photos
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_photos_delete_own" ON public.client_photos;
CREATE POLICY "client_photos_delete_own" ON public.client_photos
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: client_looks (user_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "client_looks_select_own" ON public.client_looks;
CREATE POLICY "client_looks_select_own" ON public.client_looks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_looks_insert_own" ON public.client_looks;
CREATE POLICY "client_looks_insert_own" ON public.client_looks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_looks_update_own" ON public.client_looks;
CREATE POLICY "client_looks_update_own" ON public.client_looks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_looks_delete_own" ON public.client_looks;
CREATE POLICY "client_looks_delete_own" ON public.client_looks
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: saved_models (user_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "saved_models_select_own" ON public.saved_models;
CREATE POLICY "saved_models_select_own" ON public.saved_models
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_models_insert_own" ON public.saved_models;
CREATE POLICY "saved_models_insert_own" ON public.saved_models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_models_update_own" ON public.saved_models;
CREATE POLICY "saved_models_update_own" ON public.saved_models
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_models_delete_own" ON public.saved_models;
CREATE POLICY "saved_models_delete_own" ON public.saved_models
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: generations (user_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "generations_select_own" ON public.generations;
CREATE POLICY "generations_select_own" ON public.generations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "generations_insert_own" ON public.generations;
CREATE POLICY "generations_insert_own" ON public.generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "generations_update_own" ON public.generations;
CREATE POLICY "generations_update_own" ON public.generations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "generations_delete_own" ON public.generations;
CREATE POLICY "generations_delete_own" ON public.generations
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: history_logs (user_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "history_logs_select_own" ON public.history_logs;
CREATE POLICY "history_logs_select_own" ON public.history_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "history_logs_insert_own" ON public.history_logs;
CREATE POLICY "history_logs_insert_own" ON public.history_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "history_logs_update_own" ON public.history_logs;
CREATE POLICY "history_logs_update_own" ON public.history_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "history_logs_delete_own" ON public.history_logs;
CREATE POLICY "history_logs_delete_own" ON public.history_logs
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: creative_still_templates (user_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "creative_still_templates_select_own" ON public.creative_still_templates;
CREATE POLICY "creative_still_templates_select_own" ON public.creative_still_templates
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "creative_still_templates_insert_own" ON public.creative_still_templates;
CREATE POLICY "creative_still_templates_insert_own" ON public.creative_still_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "creative_still_templates_update_own" ON public.creative_still_templates;
CREATE POLICY "creative_still_templates_update_own" ON public.creative_still_templates
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "creative_still_templates_delete_own" ON public.creative_still_templates;
CREATE POLICY "creative_still_templates_delete_own" ON public.creative_still_templates
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: creative_still_generations (user_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "creative_still_generations_select_own" ON public.creative_still_generations;
CREATE POLICY "creative_still_generations_select_own" ON public.creative_still_generations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "creative_still_generations_insert_own" ON public.creative_still_generations;
CREATE POLICY "creative_still_generations_insert_own" ON public.creative_still_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "creative_still_generations_update_own" ON public.creative_still_generations;
CREATE POLICY "creative_still_generations_update_own" ON public.creative_still_generations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "creative_still_generations_delete_own" ON public.creative_still_generations;
CREATE POLICY "creative_still_generations_delete_own" ON public.creative_still_generations
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- SECTION 4: STORAGE POLICIES
-- =============================================================================
-- Storage buckets used by the app:
--   products         - product images (path: {user_id}/...)
--   client-looks     - generated look images (path: {user_id}/{client_id}/...)
--   client-photos    - client photos (path: {user_id}/...)
--   model-images     - model generated images (path: {user_id}/{model_id}/...)
--   model-references - model reference uploads (path: {user_id}/...)
--
-- Storage paths are prefixed with the user's auth.uid(), so we use:
--   (bucket_id = 'X') AND (auth.uid()::text = (storage.foldername(name))[1])
-- which checks that the first folder in the path matches the user's ID.
--
-- NOTE: Supabase storage policies go on the storage.objects table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- BUCKET: products
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_storage_select" ON storage.objects;
CREATE POLICY "products_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "products_storage_insert" ON storage.objects;
CREATE POLICY "products_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "products_storage_update" ON storage.objects;
CREATE POLICY "products_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "products_storage_delete" ON storage.objects;
CREATE POLICY "products_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- BUCKET: client-looks
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "client_looks_storage_select" ON storage.objects;
CREATE POLICY "client_looks_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'client-looks'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "client_looks_storage_insert" ON storage.objects;
CREATE POLICY "client_looks_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-looks'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "client_looks_storage_update" ON storage.objects;
CREATE POLICY "client_looks_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'client-looks'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "client_looks_storage_delete" ON storage.objects;
CREATE POLICY "client_looks_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'client-looks'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- BUCKET: client-photos
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "client_photos_storage_select" ON storage.objects;
CREATE POLICY "client_photos_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'client-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "client_photos_storage_insert" ON storage.objects;
CREATE POLICY "client_photos_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "client_photos_storage_update" ON storage.objects;
CREATE POLICY "client_photos_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'client-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "client_photos_storage_delete" ON storage.objects;
CREATE POLICY "client_photos_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'client-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- BUCKET: model-images
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "model_images_storage_select" ON storage.objects;
CREATE POLICY "model_images_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'model-images'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "model_images_storage_insert" ON storage.objects;
CREATE POLICY "model_images_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'model-images'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "model_images_storage_update" ON storage.objects;
CREATE POLICY "model_images_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'model-images'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "model_images_storage_delete" ON storage.objects;
CREATE POLICY "model_images_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'model-images'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- BUCKET: model-references
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "model_references_storage_select" ON storage.objects;
CREATE POLICY "model_references_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'model-references'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "model_references_storage_insert" ON storage.objects;
CREATE POLICY "model_references_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'model-references'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "model_references_storage_update" ON storage.objects;
CREATE POLICY "model_references_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'model-references'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "model_references_storage_delete" ON storage.objects;
CREATE POLICY "model_references_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'model-references'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- =============================================================================
-- VERIFICATION: Re-run diagnostics after applying changes
-- =============================================================================

-- Verify RLS is enabled on all tables
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify all policies were created
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify storage policies
SELECT
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY policyname;
