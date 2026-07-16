-- Books & Friends — fix: creating a PRIVATE session failed with
-- "new row violates row-level security policy for table reading_sessions".
--
-- Cause: INSERT ... RETURNING (used by the app so it can redirect to the new
-- session) is also checked against the SELECT policy. The creator is only
-- added to session_members by an AFTER INSERT trigger, which runs after that
-- visibility check, so for a still-membership-less private row the SELECT
-- policy (visibility = 'public' OR is_session_member) failed. Public sessions
-- never hit this because visibility = 'public' alone already satisfies it.
--
-- Fix: let the creator always see their own session directly, independent of
-- the session_members trigger timing.
-- Run this in the Supabase SQL Editor after 0001-0003.

drop policy "public sessions or member sessions are readable" on public.reading_sessions;

create policy "public, own, or member sessions are readable" on public.reading_sessions
  for select using (
    visibility = 'public'
    or creator_id = auth.uid()
    or public.is_session_member(id)
  );
