# Books & Friends — Project Specification

## 1. Overview

Books & Friends is a social reading platform where members organize themselves around shared books. Any registered member can start a **reading session** for a book, others join, track their chapter-by-chapter progress with notes, and discuss the book in a single running thread with emoji reactions.

**Products:** Web App + Mobile App (iOS/Android), both backed by a shared Supabase project.

## 2. Goals

- Let anyone register and immediately create or join a reading session.
- Make a session's discussion feel like one continuous conversation (single thread), not scattered per-chapter comment sections.
- Let members log progress (chapter completed + optional note) and have that show up naturally in the thread.
- Support lightweight, expressive engagement via full-emoji reactions on any thread item.
- Support both public (discoverable) and private (invite-only) sessions.

### Non-goals (for v1)

- No built-in e-book reader/content hosting — the app tracks *metadata* (title, author, chapters) and progress, not the book's text.
- No moderation/reporting tooling beyond basic block/leave.
- No monetization, no reading challenges/gamification, no admin/back-office UI.

## 3. Users & Roles

| Role | Scope | Capabilities |
|---|---|---|
| **Guest** | App-wide | Can view public marketing/landing content only; must register to do anything else. |
| **Member** | App-wide | Register/login, create sessions, browse/join public sessions, join private sessions via invite. |
| **Session Creator** | Per-session | Everything a member can do in that session, plus: edit title/author/chapter list, set visibility (public/private), regenerate invite link, remove a member, close/archive the session. |
| **Session Member** | Per-session | Join, log progress with notes, post to the discussion thread, react to any thread item, leave the session. |

There is no app-wide admin role in v1.

## 4. Core Features

### 4.1 Authentication
- Supabase Auth: email/password signup+login, plus passwordless magic-link login.
- Email verification required before creating/joining sessions (read-only browsing allowed pre-verification, optional).
- Basic profile: display name, username (unique), avatar (stored in Supabase Storage), created on first login via a Postgres trigger from `auth.users`.

### 4.2 Reading Sessions
- Any member can create a session by submitting:
  - Title
  - Author
  - Chapter list (ordered; at minimum a chapter number/label, optionally a chapter title)
  - Visibility: **Public** (listed in a discover feed, anyone can join) or **Private** (hidden from discovery, joinable only via a shareable invite link/code)
- Creator can edit these fields and regenerate the private invite code at any time.
- Session has a status: `active` or `archived` (creator can archive). Archived sessions are **fully read-only** for all members: no new comments, progress updates, reactions, or member joins/leaves — the discussion and progress history remain visible as a permanent record.
- Public sessions appear in a paginated/searchable "Discover" list (search by title/author).

### 4.3 Joining
- **Public session:** member taps "Join" — instantly added to `session_members`.
- **Private session:** member opens the invite link (contains a join code) or enters the code manually — validated server-side via a Postgres RPC (`join_session_by_code`), then added to `session_members`.
- A member can leave a session at any time (removes their `session_members` row; their past thread posts remain, attributed to them).
- The creator can remove a member; the removed member's posts remain but they lose access to the session.

### 4.4 Progress Tracking
- For each chapter in a session, a member can mark it **complete**, optionally attaching a short free-text note ("this chapter dragged a bit, but the twist at the end was great").
- Marking a chapter complete does two things atomically:
  1. Upserts a row in `member_progress` (the canonical completion state — powers each member's progress bar, e.g. "7/12 chapters").
  2. Appends a `progress` item to the session's single discussion thread, so other members see it flow in alongside comments.
- Members can un-check a chapter (removes the progress row) or edit/delete their own progress note.
- Each session shows an overview of all members' progress (e.g., avatars aligned along a chapter timeline).

### 4.5 Discussion Thread
- Each session has exactly **one** discussion thread — a single reverse-chronological (or chronological, TBD in design) feed mixing:
  - Regular text comments
  - Progress-note items (see 4.4), visually distinguished (e.g. a small "chapter" badge) but living in the same feed
- Any session member can post a comment; edit/delete their own posts (soft delete, so reaction/reply context isn't broken).
- Feed order is **reverse-chronological** (newest first), like a standard activity feed; new posts prepend to the top and arrive live via Realtime for members currently viewing.
- Pagination/infinite scroll (cursor-based, scrolling down loads older posts) for long threads.
- No nested replies/sub-threads in v1 — flat feed only, matching "discuss about it in a single thread."

### 4.6 Reactions
- Any thread item (comment or progress note) can be reacted to with a **full emoji picker** (not a fixed set).
- One reaction per (user, item, emoji) — a user can react to the same post with multiple different emoji, but not the same emoji twice.
- Reaction counts are aggregated per emoji and shown under the item (e.g. 👍3 😂1); tapping a summary shows who reacted.
- Reactions update live via Realtime.

## 5. Data Model (Postgres / Supabase)

```
profiles
  id                uuid PK, references auth.users(id)
  username          text unique not null
  display_name      text
  avatar_url        text
  created_at        timestamptz default now()

reading_sessions
  id                uuid PK default gen_random_uuid()
  creator_id        uuid references profiles(id) not null
  title             text not null
  author            text not null
  visibility        text check (visibility in ('public','private')) not null default 'public'
  join_code         text unique          -- only meaningful when visibility = 'private'
  status            text check (status in ('active','archived')) not null default 'active'
  created_at        timestamptz default now()

session_chapters
  id                uuid PK default gen_random_uuid()
  session_id        uuid references reading_sessions(id) on delete cascade
  chapter_number     int not null
  chapter_title      text
  position          int not null            -- explicit ordering
  unique (session_id, chapter_number)

session_members
  session_id        uuid references reading_sessions(id) on delete cascade
  user_id           uuid references profiles(id) on delete cascade
  role              text check (role in ('creator','member')) not null default 'member'
  joined_at         timestamptz default now()
  primary key (session_id, user_id)

member_progress
  session_id        uuid references reading_sessions(id) on delete cascade
  user_id           uuid references profiles(id) on delete cascade
  chapter_id        uuid references session_chapters(id) on delete cascade
  completed_at      timestamptz default now()
  primary key (session_id, user_id, chapter_id)

thread_posts
  id                uuid PK default gen_random_uuid()
  session_id        uuid references reading_sessions(id) on delete cascade
  user_id           uuid references profiles(id) not null
  post_type         text check (post_type in ('comment','progress')) not null
  body              text
  chapter_id        uuid references session_chapters(id)   -- set only when post_type = 'progress'
  created_at        timestamptz default now()
  updated_at        timestamptz
  deleted_at        timestamptz

reactions
  id                uuid PK default gen_random_uuid()
  post_id           uuid references thread_posts(id) on delete cascade
  user_id           uuid references profiles(id) on delete cascade
  emoji             text not null            -- unicode emoji character
  created_at        timestamptz default now()
  unique (post_id, user_id, emoji)
```

### Row Level Security (high level)
- `reading_sessions`: `select` allowed if `visibility = 'public'` OR requester is in `session_members`; `insert` where `creator_id = auth.uid()`; `update/delete` only by creator.
- `session_chapters`, `member_progress`, `thread_posts`, `reactions`: `select`/`insert` gated on requester being a row in `session_members` for that `session_id`; `update/delete` gated on `user_id = auth.uid()` (own rows) or creator for chapter edits.
- `session_members`: self-insert allowed directly for public sessions; private-session joins go through a `security definer` RPC (`join_session_by_code`) that validates the code before inserting, so the join code itself is never exposed via a readable column policy to non-members.
- `profiles`: publicly readable (needed for author/avatar display across sessions), writable only by the owning user.

## 6. Backend (Supabase)

- **Database**: Postgres tables above + RLS policies.
- **Auth**: Supabase Auth (email/password + magic link). `handle_new_user` trigger creates a `profiles` row on signup.
- **Realtime**: Postgres changes subscriptions on `thread_posts` and `reactions` (scoped per session) power the live thread; on `session_members` to update the member list/progress overview live.
- **Storage**: bucket `avatars` (public read, owner write) for profile pictures.
- **Edge Functions / RPC**:
  - `join_session_by_code(code text)` — validates and joins a private session.
  - `regenerate_join_code(session_id uuid)` — creator-only, rotates the invite code.
  - Optionally, a `toggle_chapter_complete` RPC that performs the `member_progress` upsert + `thread_posts` insert as one transaction (keeps this invariant enforced server-side rather than relying on client-side ordering).

## 7. Applications

### 7.1 Web App
- **Implemented as:** Vite + React + TypeScript + Tailwind CSS v4 (not Next.js — chosen when implementation started, see §10).
- `@supabase/supabase-js` for auth/session/data/realtime; `react-router-dom` for routing; `emoji-picker-react` for reactions.
- Key screens: Landing (`/`), Login/Signup, Discover (`/discover`, public sessions + "My sessions" + join-by-code), Create Session (`/new`), Session Detail (`/sessions/:id` — chapters, member progress overview, thread), Profile.

### 7.2 Mobile App
- **Implemented as:** React Native + Expo Router (TypeScript), in `mobile/`, as a standalone app rather than a `packages/shared` monorepo (see §10 — chosen for simplicity over shared-package tooling overhead).
- Bottom tabs: Discover (search + join-by-code), My Sessions, Profile. Session detail and Create Session are pushed as stack screens (Create Session as a modal) outside the tabs.
- `@supabase/supabase-js` + `@react-native-async-storage/async-storage` + `react-native-url-polyfill` for the client; `rn-emoji-keyboard` for reactions; `expo-image-picker` for avatar uploads.
- Auth-gated navigation via Expo Router's `Stack.Protected` guard in the root layout (SDK 53+ pattern) rather than manual redirects.
- Feature parity with web: edit/archive session, join/leave, remove member, chapters + progress notes, thread with pagination and edit/delete, full-emoji reactions, profile + avatar.

### 7.3 Shared
- No shared code package between web and mobile — `types/database.ts`, `lib/timeAgo.ts`, and the general component structure are duplicated (not imported) across `web/` and `mobile/`. Small enough surface area that a monorepo/shared-package setup (Turborepo, pnpm workspaces) wasn't worth the tooling cost for two apps; revisit if a third client or heavier drift risk appears.

## 8. Non-Functional Requirements

- **Security**: RLS enforced on every table (no service-role key on client); input validation client- and server-side (RPCs use `security definer` sparingly and validate inputs).
- **Performance**: paginate `thread_posts` (cursor-based on `created_at`); index `thread_posts(session_id, created_at)` and `session_members(user_id)`.
- **Accessibility**: web app meets basic WCAG AA (keyboard nav, contrast, alt text for avatars).
- **Offline/mobile**: basic tolerance for flaky connections — optimistic UI for posting comments/reactions with retry/rollback.
- **Limits** (enforced via DB check constraints + client validation): chapter list capped at 500 chapters per session; comment/progress-note body capped at 2,000 characters; session title/author capped at 200 characters each.

## 9. Phase 2 / Future Considerations (out of scope for v1)

- Push notifications (Expo Push + web push) for new comments/reactions/session activity.
- Threaded replies within the discussion feed.
- Book metadata lookup (cover art, ISBN) via an external API (e.g. Open Library) instead of manual title/author entry.
- Session approval workflow for private sessions (request-to-join instead of code-only).
- Reporting/blocking for moderation.
- Reading reminders/schedule (target dates per chapter).

## 10. Current Supabase Project (Implementation Notes)

Live project: `https://vvkacqbhnykgepylmpmo.supabase.co`. The web app authenticates with the **publishable key** (`sb_publishable_...`, Supabase's newer anon-key format) via `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in `web/.env.local` (gitignored). No service-role key is used anywhere in the client.

### Migrations
Schema is hand-applied via the Supabase SQL Editor (no CLI project link), in order, from [supabase/migrations/](supabase/migrations/):
- `0001_init.sql` — all tables, RLS policies, triggers, RPCs (`join_session_by_code`, `regenerate_join_code`, `toggle_chapter_complete`), realtime publication (`thread_posts`, `reactions`, `session_members`), and the `avatars` storage bucket.
- `0002_fix_member_visibility.sql` — broadens the `session_members` SELECT policy so a **public** session's roster/reader-count is visible to everyone, not just existing members (needed for the Discover page's "N readers" count).
- `0003_add_member_progress_realtime.sql` — adds `member_progress` to the realtime publication (missing from 0001; without it, chapter-completion UI only updated after a manual reload).
- `0004_fix_creator_returning.sql` — fixes private-session creation, which failed with `new row violates row-level security policy for table "reading_sessions"`. Cause: `INSERT ... RETURNING` (used by the app to redirect to the new session) is also checked against the table's SELECT policy, and the creator's `session_members` row is only added by an `AFTER INSERT` trigger that runs too late for that check. Public sessions never hit this because `visibility = 'public'` alone already satisfies the SELECT policy. Fix: SELECT policy now also allows `creator_id = auth.uid()` directly.

When adding new tables/columns going forward, remember: (a) add any table that needs live client updates to the `supabase_realtime` publication explicitly — it is *not* automatic; (b) if a policy's SELECT check depends on a side-effect from an `AFTER INSERT` trigger on the same table, an `INSERT ... RETURNING`/`.select()` from that same request will fail until the trigger's effect is already guaranteed some other way (e.g. checking `creator_id`/`user_id` directly rather than only via a join table).

### Auth configuration
- **Email confirmations are currently disabled** (Dashboard → Authentication → Sign In / Providers → Email → "Confirm email" off) to simplify local testing — `supabase.auth.signUp()` signs the user in immediately and no confirmation email is ever sent. `SignupPage.tsx`/`signup.tsx` check `data.session` after sign-up and redirect straight into the app when this is the case, rather than showing a "check your email" message.
- Before real users sign up, re-enable email confirmations. Supabase's built-in email sending is rate-limited and not reliable for production — configure custom SMTP in the dashboard first.

### Mobile app notes (Expo)
- `mobile/.env.local` holds the same project URL/publishable key, exposed via Expo's `EXPO_PUBLIC_` env var convention (`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- `app.json`'s `web.output` **must stay `"single"`** (SPA), not the Expo default `"static"`. Static/server output runs part of the render on Node during dev, and the Supabase client (which touches `window`/`AsyncStorage` at init for session recovery) throws `ReferenceError: window is not defined` under that SSR pass. This app is fully authenticated/dynamic with no SEO need, so SPA output is also just the right choice, not only a workaround.
- Custom `Button`/pressable components must `forwardRef` and spread unrecognized props through to the underlying `Pressable` — Expo Router's `<Link asChild>` clones the child and injects `href`/`onPress`; a component that doesn't forward those silently breaks navigation with no error.
- Verified via `expo start --web` (browser preview) rather than a native simulator in this environment; native iOS/Android behavior (camera roll picker, gesture handling, safe-area insets) should still get a real-device pass before shipping.

### Known test data
A few rows created during manual verification live in the project (e.g. sessions titled "Curl Test Public/Private", duplicate profiles named after ad hoc test accounts). Safe to delete via the SQL Editor or dashboard whenever convenient.
