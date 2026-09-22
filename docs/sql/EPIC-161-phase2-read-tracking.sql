-- EPIC-161 Phase 2: 회원별 게시글 열람 기록(post_views) — 하루 N개 열람 제한과
-- "게시판 완독(모든 글 열람+댓글+좋아요)" 뱃지 자동지급 둘 다 이 테이블 하나를
-- 기반으로 한다. 한 번 본 글은 unique(member_id, post_id)로 다시 세지 않는다
-- (오늘 "새로" 여는 글만 하루 한도에 걸리고, 예전에 이미 열어본 글은 언제든
-- 다시 볼 수 있다).

create table if not exists post_views (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (member_id, post_id)
);

create index if not exists post_views_member_board_idx on post_views (member_id, board_id, viewed_at);

alter table post_views enable row level security;

create policy "post_views_own_insert" on post_views for insert
  with check (exists (select 1 from members where members.id = post_views.member_id and members.auth_user_id = auth.uid()));

create policy "post_views_own_select" on post_views for select
  using (exists (select 1 from members where members.id = post_views.member_id and members.auth_user_id = auth.uid()));

-- 등급별 하루 열람 제한 — {"<rank>": <count>} 형태(예: {"2":1,"3":2} = Great
-- Gatsby는 하루 1개, Patron은 하루 2개까지 "새 글"을 열람 가능, 키가 없는
-- 등급은 무제한). null = 이 게시판엔 하루 제한 없음(기존 동작 유지).
alter table boards add column if not exists daily_view_limits jsonb;

-- EPIC-161 Phase 2: 게시판 완독 뱃지 자동 지급 — post_views에 새 행이 생길 때마다
-- (member,board) 기준으로 "이 게시판 전체 글을 다 봤는지 + 댓글을 단 적 있는지 +
-- 좋아요를 누른 적 있는지"를 확인하고, boards.badge_min_rank 이상 등급이면서
-- 아직 이 게시판 뱃지가 없으면 member_badges에 지급한다. member_badges는
-- INSERT가 admin 전용 RLS라(docs/sql 기존 정책) 클라이언트에서 직접 못 쓰므로,
-- SECURITY DEFINER 트리거 함수로 우회한다(테이블 소유자 권한으로 실행되어
-- RLS를 자연스럽게 통과 — CLAUDE.md의 자기참조 정책 우회와 같은 기법).
create or replace function public.check_and_grant_board_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge_min_rank integer;
  v_board_name text;
  v_member_rank integer;
  v_total_posts integer;
  v_viewed_posts integer;
  v_has_comment boolean;
  v_has_like boolean;
  v_badge_name text;
  v_already boolean;
begin
  select badge_min_rank, name into v_badge_min_rank, v_board_name
  from boards where id = new.board_id;

  if v_badge_min_rank is null then
    return new;
  end if;

  select membership_rank into v_member_rank from members where id = new.member_id;
  if v_member_rank is null or v_member_rank < v_badge_min_rank then
    return new;
  end if;

  v_badge_name := '게시판 완독 — ' || coalesce(v_board_name, '');

  select exists(
    select 1 from member_badges
    where member_id = new.member_id and badge_name = v_badge_name
  ) into v_already;
  if v_already then
    return new;
  end if;

  select count(*) into v_total_posts from posts where board_id = new.board_id;
  if v_total_posts = 0 then
    return new;
  end if;

  select count(*) into v_viewed_posts
  from post_views where member_id = new.member_id and board_id = new.board_id;
  if v_viewed_posts < v_total_posts then
    return new;
  end if;

  select exists(
    select 1 from comments c join posts p on p.id = c.post_id
    where p.board_id = new.board_id and c.author_id = new.member_id
  ) into v_has_comment;
  if not v_has_comment then
    return new;
  end if;

  select exists(
    select 1 from likes l join posts p on p.id = l.post_id
    where p.board_id = new.board_id and l.member_id = new.member_id
  ) into v_has_like;
  if not v_has_like then
    return new;
  end if;

  insert into member_badges (member_id, badge_name) values (new.member_id, v_badge_name);

  return new;
end;
$$;

drop trigger if exists post_views_badge_check on post_views;
create trigger post_views_badge_check
  after insert on post_views
  for each row execute function public.check_and_grant_board_badge();
