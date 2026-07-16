-- Books & Friends — initial schema
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- for project https://vvkacqbhnykgepylmpmo.supabase.co

-- ============================================================================
-- TABLES
-- ============================================================================

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table public.reading_sessions (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) <= 200),
  author      text not null check (char_length(author) <= 200),
  visibility  text not null default 'public' check (visibility in ('public', 'private')),
  join_code   text unique not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  status      text not null default 'active' check (status in ('active', 'archived')),
  created_at  timestamptz not null default now()
);

create table public.session_chapters (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.reading_sessions(id) on delete cascade,
  chapter_number int not null,
  chapter_title  text,
  position       int not null,
  unique (session_id, chapter_number)
);

create table public.session_members (
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('creator', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table public.member_progress (
  session_id   uuid not null references public.reading_sessions(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  chapter_id   uuid not null references public.session_chapters(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (session_id, user_id, chapter_id)
);

create table public.thread_posts (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_type  text not null check (post_type in ('comment', 'progress')),
  body       text check (body is null or char_length(body) <= 2000),
  chapter_id uuid references public.session_chapters(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table public.reactions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.thread_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);

create index idx_thread_posts_session_created on public.thread_posts (session_id, created_at desc);
create index idx_session_members_user on public.session_members (user_id);
create index idx_session_chapters_session_position on public.session_chapters (session_id, position);
create index idx_reading_sessions_discover on public.reading_sessions (visibility, status, created_at desc);
create index idx_reactions_post on public.reactions (post_id);

-- ============================================================================
-- HELPER FUNCTIONS (security definer, used inside RLS policies to avoid recursion)
-- ============================================================================

create or replace function public.is_session_member(p_session_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from session_members
    where session_id = p_session_id and user_id = p_user_id
  );
$$;

create or replace function public.can_view_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from reading_sessions rs
    where rs.id = p_session_id
      and (rs.visibility = 'public' or public.is_session_member(rs.id))
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.session_chapters enable row level security;
alter table public.session_members enable row level security;
alter table public.member_progress enable row level security;
alter table public.thread_posts enable row level security;
alter table public.reactions enable row level security;

-- profiles
create policy "profiles are publicly readable" on public.profiles
  for select using (true);
create policy "users insert their own profile" on public.profiles
  for insert with check (id = auth.uid());
create policy "users update their own profile" on public.profiles
  for update using (id = auth.uid());

-- reading_sessions
create policy "public sessions or member sessions are readable" on public.reading_sessions
  for select using (visibility = 'public' or public.is_session_member(id));
create policy "members can create sessions" on public.reading_sessions
  for insert with check (creator_id = auth.uid());
create policy "creator can update session" on public.reading_sessions
  for update using (creator_id = auth.uid());
create policy "creator can delete session" on public.reading_sessions
  for delete using (creator_id = auth.uid());

-- session_chapters
create policy "chapters readable if session is viewable" on public.session_chapters
  for select using (public.can_view_session(session_id));
create policy "creator manages chapters" on public.session_chapters
  for all using (
    exists (select 1 from reading_sessions rs where rs.id = session_id and rs.creator_id = auth.uid())
  ) with check (
    exists (select 1 from reading_sessions rs where rs.id = session_id and rs.creator_id = auth.uid())
  );

-- session_members
create policy "members roster readable by members" on public.session_members
  for select using (public.is_session_member(session_id));
create policy "self-join to public active sessions" on public.session_members
  for insert with check (
    user_id = auth.uid()
    and role = 'member'
    and exists (
      select 1 from reading_sessions rs
      where rs.id = session_id and rs.visibility = 'public' and rs.status = 'active'
    )
  );
create policy "leave session or creator removes member" on public.session_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from reading_sessions rs where rs.id = session_id and rs.creator_id = auth.uid())
  );

-- member_progress
create policy "progress readable by session members" on public.member_progress
  for select using (public.is_session_member(session_id));
create policy "members manage their own progress" on public.member_progress
  for all using (
    user_id = auth.uid() and public.is_session_member(session_id)
  ) with check (
    user_id = auth.uid()
    and public.is_session_member(session_id)
    and exists (select 1 from reading_sessions rs where rs.id = session_id and rs.status = 'active')
  );

-- thread_posts
create policy "posts readable by session members" on public.thread_posts
  for select using (public.is_session_member(session_id));
create policy "members post to active sessions" on public.thread_posts
  for insert with check (
    user_id = auth.uid()
    and public.is_session_member(session_id)
    and exists (select 1 from reading_sessions rs where rs.id = session_id and rs.status = 'active')
  );
create policy "authors edit their own posts" on public.thread_posts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reactions
create policy "reactions readable by session members" on public.reactions
  for select using (
    exists (
      select 1 from thread_posts tp
      where tp.id = post_id and public.is_session_member(tp.session_id)
    )
  );
create policy "members react in active sessions" on public.reactions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from thread_posts tp
      join reading_sessions rs on rs.id = tp.session_id
      where tp.id = post_id and public.is_session_member(tp.session_id) and rs.status = 'active'
    )
  );
create policy "members remove their own reactions" on public.reactions
  for delete using (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- create a profile row automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'reader_' || substr(new.id::text, 1, 8),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- add the creator as a member automatically when a session is created
create or replace function public.handle_new_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.session_members (session_id, user_id, role)
  values (new.id, new.creator_id, 'creator')
  on conflict (session_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_session_created
  after insert on public.reading_sessions
  for each row execute function public.handle_new_session();

-- cap chapters per session
create or replace function public.enforce_chapter_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.session_chapters where session_id = new.session_id) >= 500 then
    raise exception 'A session cannot have more than 500 chapters';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_chapter_limit
  before insert on public.session_chapters
  for each row execute function public.enforce_chapter_limit();

-- stamp updated_at when a post's body is edited
create or replace function public.touch_thread_post()
returns trigger
language plpgsql
as $$
begin
  if new.body is distinct from old.body then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_touch_thread_post
  before update on public.thread_posts
  for each row execute function public.touch_thread_post();

-- ============================================================================
-- RPCs
-- ============================================================================

-- join a private session using its invite code
create or replace function public.join_session_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_status text;
begin
  select id, status into v_session_id, v_status
  from reading_sessions
  where join_code = p_code and visibility = 'private';

  if v_session_id is null then
    raise exception 'Invalid invite code';
  end if;

  if v_status <> 'active' then
    raise exception 'This session is archived and no longer accepting members';
  end if;

  insert into session_members (session_id, user_id, role)
  values (v_session_id, auth.uid(), 'member')
  on conflict (session_id, user_id) do nothing;

  return v_session_id;
end;
$$;

-- creator rotates the invite code for a private session
create or replace function public.regenerate_join_code(p_session_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_code text;
begin
  if not exists (
    select 1 from reading_sessions where id = p_session_id and creator_id = auth.uid()
  ) then
    raise exception 'Only the creator can regenerate the invite code';
  end if;

  v_new_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  update reading_sessions set join_code = v_new_code where id = p_session_id;
  return v_new_code;
end;
$$;

-- atomically toggle a chapter's completion + drop a progress note in the thread
create or replace function public.toggle_chapter_complete(
  p_session_id uuid,
  p_chapter_id uuid,
  p_completed boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  select status into v_status from reading_sessions where id = p_session_id;
  if v_status is null or v_status <> 'active' then
    raise exception 'Session is not active';
  end if;

  if not exists (select 1 from session_members where session_id = p_session_id and user_id = v_uid) then
    raise exception 'Not a member of this session';
  end if;

  if not exists (select 1 from session_chapters where id = p_chapter_id and session_id = p_session_id) then
    raise exception 'Chapter does not belong to this session';
  end if;

  if p_completed then
    insert into member_progress (session_id, user_id, chapter_id)
    values (p_session_id, v_uid, p_chapter_id)
    on conflict (session_id, user_id, chapter_id) do nothing;

    insert into thread_posts (session_id, user_id, post_type, body, chapter_id)
    values (p_session_id, v_uid, 'progress', p_note, p_chapter_id);
  else
    delete from member_progress
    where session_id = p_session_id and user_id = v_uid and chapter_id = p_chapter_id;
  end if;
end;
$$;

-- ============================================================================
-- REALTIME
-- ============================================================================

alter publication supabase_realtime add table public.thread_posts;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.session_members;

-- ============================================================================
-- STORAGE (avatars)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "users upload their own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update their own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete their own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
