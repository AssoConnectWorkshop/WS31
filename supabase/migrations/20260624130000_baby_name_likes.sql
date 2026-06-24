create table if not exists baby_name_likes (
  id bigint generated always as identity primary key,
  partner_id text not null check (partner_id in ('partner_a', 'partner_b')),
  name_id bigint not null references baby_names(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (partner_id, name_id)
);
