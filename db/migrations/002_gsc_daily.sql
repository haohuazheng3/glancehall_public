-- Daily Search Console performance by page and query (pulled by .github/workflows/gsc.yml).
create table if not exists gsc_daily (
  day date not null,
  page text not null,
  query text not null,
  clicks integer not null,
  impressions integer not null,
  ctr real not null,
  position real not null,
  pulled_at timestamptz not null default now(),
  primary key (day, page, query)
);
create index if not exists gsc_daily_page_idx on gsc_daily (page, day desc);

-- One row per daily check of the submitted sitemap: what Google says it downloaded and found.
create table if not exists gsc_sitemap_checks (
  checked_at timestamptz not null default now(),
  sitemap text not null,
  last_downloaded timestamptz,
  is_pending boolean,
  submitted integer,
  indexed integer,
  errors integer,
  warnings integer,
  primary key (checked_at, sitemap)
);
