-- 047_users_self_update_policy.sql
--
-- Adds a self-UPDATE policy on public.users so authenticated users can
-- write their own onboarding fields (baseline_score, preferred_language,
-- streak_count, etc.). Without this, the existing SELECT-only policy
-- caused supabase.from('users').update(...) to silently affect 0 rows
-- with no error returned to the client — onboarding submits never
-- persisted baseline_score, leaving every user stuck in a /onboarding
-- redirect loop on subsequent logins.
--
-- The role column is intentionally NOT writable by the user; admin-only
-- elevation must go through a separate admin-gated path. We enforce that
-- via WITH CHECK that pins role to its current value.

CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  );
