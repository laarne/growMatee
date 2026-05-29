-- Migration to add parent_id to post_comments table to support replies
alter table public.post_comments 
add column if not exists parent_id uuid references public.post_comments(id) on delete cascade;

-- Index to optimize fetching replies
create index if not exists post_comments_parent_idx 
on public.post_comments(parent_id);
