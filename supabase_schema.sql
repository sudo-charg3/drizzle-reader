-- Users are handled by Supabase Auth, no separate users table needed

create table pdfs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  file_name text not null,
  page_count integer default 0,
  file_size_bytes bigint default 0,
  added_at timestamptz default now(),
  last_opened_at timestamptz,
  storage_path text not null
);

create table pdf_settings (
  pdf_id uuid primary key references pdfs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  theme text default 'paper',
  font_size integer default 17,
  font text default 'lora',
  line_spacing text default 'comfortable',
  last_page integer default 1,
  pages_read integer default 0,
  total_pages integer default 0,
  highlights jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- Row Level Security
alter table pdfs enable row level security;
alter table pdf_settings enable row level security;

create policy "Users can only access their own pdfs"
  on pdfs for all using (auth.uid() = user_id);

create policy "Users can only access their own settings"
  on pdf_settings for all using (auth.uid() = user_id);

-- Make sure to create a private bucket named 'pdfs' and add policy (auth.uid() = owner) for uploads and reads.
