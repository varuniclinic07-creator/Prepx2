-- 046_handle_new_user_trigger.sql
-- Purpose: sync auth.users -> public.users on signup.
--
-- Drift discovered 2026-04-30 by auth slice HTTP probe (B1/B2/B6a):
--   - public.users.id has FK REFERENCES auth.users (002_users.sql)
--   - But no migration ever wrote a trigger to populate public.users
--   - Result: every signup since launch produces an authenticated user with
--     no profile row. middleware.ts:105 admin role check, getUserProfile,
--     and ~all lib/*.ts business logic silently see NULL/empty.
--
-- Fix: standard Supabase pattern — SECURITY DEFINER function fired by an
-- AFTER INSERT trigger on auth.users. Idempotent; safe to re-run.
--
-- The function must be SECURITY DEFINER because the auth.users INSERT runs
-- as the auth role, which doesn't have INSERT on public.users by default.
-- We pin search_path to defeat the well-known SECURITY DEFINER hijack
-- vector (an attacker creating a public.users in their own schema).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, subscription_status, role, preferred_language, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    'aspirant',
    'en',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill any auth.users rows that don't have a corresponding public.users.
-- This is the "every signup since launch is half-wired" remediation.
INSERT INTO public.users (id, email, subscription_status, role, preferred_language, created_at, updated_at)
SELECT au.id, au.email, 'free', 'aspirant', 'en', now(), now()
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
