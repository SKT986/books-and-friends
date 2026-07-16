-- Books & Friends — fix: member_progress changes never reached subscribed
-- clients because the table was missing from the realtime publication.
-- Run this in the Supabase SQL Editor after 0001 and 0002.

alter publication supabase_realtime add table public.member_progress;
