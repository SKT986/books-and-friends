-- Books & Friends — fix: public sessions should expose their roster/member
-- count to everyone (needed for the Discover page reader count), not just
-- existing members. Private sessions still restrict the roster to members.
-- Run this in the Supabase SQL Editor after 0001_init.sql.

drop policy "members roster readable by members" on public.session_members;

create policy "roster readable if session is viewable" on public.session_members
  for select using (public.can_view_session(session_id));
