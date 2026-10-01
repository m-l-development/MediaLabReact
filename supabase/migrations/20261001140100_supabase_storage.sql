-- ConnectHub P7 · SUPABASE-SPESIFIKT: privat bøtte for bilder. Ingen policyer på storage.objects for anon/authenticated,
-- så klienter kan verken lese, liste eller skrive direkte – bare serveren (service_role) via server/adapters/supabase.js,
-- og visning skjer med kortlivede signerte lenker. Bøtta godtar bare bildeformater og maks 4 MB (i tillegg til serverens
-- og databasens kontroller). Ved bytte av fillagring: tilsvarende privat bøtte hos ny leverandør (S3-kompatibel).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ch-files', 'ch-files', false, 4194304, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
