create table if not exists tenants (
  id text primary key,
  name text not null,
  api_key text not null unique,
  stripe_subscription_item_id text,
  forward_allow_hosts text -- JSON array of hostnames allowed for forward_url
  , redact_paths text -- JSON array of redact paths
  , stripe_customer_id text
  , free_fallback_quota integer -- optional per-tenant free tier override
);

create table if not exists fallback_usage (
  tenant_id text not null,
  period text not null, -- YYYY-MM
  count integer not null default 0,
  primary key (tenant_id, period),
  foreign key (tenant_id) references tenants(id) on delete cascade
);

create table if not exists runs (
  trace_id text primary key,
  tenant_id text not null,
  cid text not null,
  decision text not null,
  repairs text not null,
  created_at text not null,
  foreign key (tenant_id) references tenants(id) on delete cascade
);
