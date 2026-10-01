-- ConnectHub P3 · 2/4 · Kjernetabeller. Vanlig PostgreSQL.
-- Egen bruker-ID (app_users) – aldri leverandørens brukertabell. user_identities kobler innloggingsleverandøren
-- (OIDC iss/sub) til vår bruker, slik at innlogging kan byttes uten å endre resten av databasen.
-- «Vanlig bruker» = aktivt medlemskap. Administrative roller ligger i user_roles.

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  full_name text check (length(full_name) <= 120),
  phone text check (length(phone) <= 40),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index app_users_email_uniq on public.app_users (lower(email));

create table public.user_identities (
  provider text not null check (length(provider) between 1 and 300),  -- JWT-ens iss (utsteder)
  subject text not null check (length(subject) between 1 and 300),   -- JWT-ens sub
  user_id uuid not null references public.app_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (provider, subject)
);
create index user_identities_user_idx on public.user_identities (user_id);

create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  status text not null default 'active' check (status in ('active', 'temporarily_disabled', 'pending_deletion', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  user_id uuid not null references public.app_users (id) on delete cascade,
  church_id uuid not null references public.churches (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, church_id)
);
create index memberships_church_idx on public.memberships (church_id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  role text not null check (role in ('developer', 'moderator', 'church_admin')),
  church_id uuid references public.churches (id) on delete cascade,
  assigned_by uuid references public.app_users (id) on delete set null,
  assigned_at timestamptz not null default now(),
  reason text check (length(reason) <= 500),
  revoked_at timestamptz,
  revoked_by uuid references public.app_users (id) on delete set null,
  check ((role in ('developer', 'moderator') and church_id is null) or (role = 'church_admin' and church_id is not null))
);
-- Ingen dupliserte aktive tildelinger, og én aktiv admin per menighet (erstatning = tilbakekall + ny tildeling).
create unique index user_roles_active_uniq on public.user_roles (user_id, role, coalesce(church_id, '00000000-0000-0000-0000-000000000000'::uuid)) where revoked_at is null;
create unique index user_roles_one_admin_per_church on public.user_roles (church_id) where role = 'church_admin' and revoked_at is null;
create index user_roles_user_idx on public.user_roles (user_id) where revoked_at is null;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  church_id uuid references public.churches (id) on delete cascade,
  role text not null check (role in ('user', 'church_admin', 'moderator', 'developer')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),  -- SHA-256; selve tokenet lagres aldri
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references public.app_users (id) on delete set null,
  check (role in ('moderator', 'developer') or church_id is not null)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.app_users (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  church_id uuid,
  reason text,
  meta jsonb not null default '{}'::jsonb check (pg_column_size(meta) < 4000),
  created_at timestamptz not null default now()
);
create index audit_logs_church_idx on public.audit_logs (church_id, created_at desc);

-- Filmetadata (innholdet håndteres i P7). Video kan aldri registreres – fast krav.
create table public.files (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete restrict,
  storage_provider text not null default 'supabase',
  storage_key text not null unique,
  file_name text not null check (length(file_name) between 1 and 200),
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint files_no_video_mime check (mime_type !~* '^video/'),
  constraint files_no_video_name check (lower(file_name) !~ '\.(mp4|m4v|mov|qt|webm|mkv|avi|wmv|mpe?g|mts|m2ts|ts|3gp|3g2|flv|f4v|ogv|vob|mxf|hevc|h264|h265)$')
);
create index files_church_idx on public.files (church_id);
