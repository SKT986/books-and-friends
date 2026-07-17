# Books & Friends

A social reading platform where members organize themselves around shared books — start or join a reading session, track chapter-by-chapter progress, and discuss the book in a single running thread with emoji reactions.

See [PROJECT_SPEC.md](./PROJECT_SPEC.md) for the full product spec.

## Structure

```
web/       React + Vite web app
mobile/    Expo (React Native) mobile app
supabase/  Database migrations (shared Supabase project)
```

## Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project (free tier is fine)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for running migrations)
- Expo Go app on your phone, or an iOS/Android simulator, for mobile development

## 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Apply the database schema by running the SQL files in [supabase/migrations](./supabase/migrations) in order (`0001_init.sql` → `0005_lock_archived_session_edits.sql`), either via the Supabase SQL editor or with the CLI:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

3. From your Supabase project settings, grab the **Project URL** and the **publishable/anon key** — you'll need these in the next steps.

## 2. Web app setup

```bash
cd web
npm install
cp .env.local.example .env.local
```

Fill in `web/.env.local`:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Run the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## 3. Mobile app setup

```bash
cd mobile
npm install
cp .env.local.example .env.local
```

Fill in `mobile/.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Start the Expo dev server:

```bash
npm run start
```

Then scan the QR code with Expo Go, or press `i` / `a` to launch the iOS/Android simulator. `npm run web` runs the mobile app in a browser.

## Notes

- Both apps read Supabase credentials from environment variables — never commit `.env.local` files (they're already gitignored).
- The web and mobile apps share the same Supabase backend, so a single set of migrations serves both.
