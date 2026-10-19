-- ConnectHub · SUPABASE-SPESIFIKT: den private bøtta godtar filer på høyst 30 MB (se 20261020130000_direct_uploads.sql).
-- Bare bildeformater som før. Logoer (10 MB) og andre grenser håndheves av serveren og databasen.
update storage.buckets set file_size_limit = 31457280 where id = 'ch-files';
