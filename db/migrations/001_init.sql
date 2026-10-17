-- Subscribers to "next round" emails.
create table if not exists subscribers (
  id bigserial primary key,
  email text not null unique,
  source text not null default 'site',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- Messages from the contact form.
create table if not exists contact_messages (
  id bigserial primary key,
  name text,
  email text not null,
  topic text,
  message text not null,
  ip_hash text,
  user_agent text,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on contact_messages (created_at desc);

-- Self-hosted error inbox, grouped by fingerprint (error name + first stack frame + route).
create table if not exists error_groups (
  fingerprint text primary key,
  source text not null,              -- server | client | edge
  name text not null,
  message text not null,
  first_frame text,
  route text,
  severity text not null default 'error',
  count integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz,
  sample jsonb
);
create index if not exists error_groups_open_idx on error_groups (resolved_at, last_seen desc);

-- Fixed-window rate limiting shared by every serverless instance.
create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create table if not exists schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
