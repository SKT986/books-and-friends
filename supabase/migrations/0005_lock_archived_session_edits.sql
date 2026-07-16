-- Books & Friends — enforce "archived sessions are fully read-only" for
-- actions the original policies missed: editing/deleting an existing thread
-- post, and leaving/removing a member. (New posts, reactions, progress, and
-- self-joins were already correctly gated on session status = 'active'.)
-- Run this in the Supabase SQL Editor after 0001-0004.

drop policy "authors edit their own posts" on public.thread_posts;

create policy "authors edit their own posts on active sessions" on public.thread_posts
  for update using (
    user_id = auth.uid()
    and exists (select 1 from reading_sessions rs where rs.id = session_id and rs.status = 'active')
  ) with check (
    user_id = auth.uid()
    and exists (select 1 from reading_sessions rs where rs.id = session_id and rs.status = 'active')
  );

drop policy "leave session or creator removes member" on public.session_members;

create policy "leave or remove member on active sessions" on public.session_members
  for delete using (
    exists (select 1 from reading_sessions rs where rs.id = session_id and rs.status = 'active')
    and (
      user_id = auth.uid()
      or exists (select 1 from reading_sessions rs where rs.id = session_id and rs.creator_id = auth.uid())
    )
  );
