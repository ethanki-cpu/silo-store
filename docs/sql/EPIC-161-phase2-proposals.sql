-- EPIC-161 Phase 2: "제안" 기능 — Lautrec 등급 다수 게시판에서 "글쓰기 가능"보다
-- 약한 "제안 가능"(글쓰기 제안/카테고리 제안/게시글 삭제 제안 등)으로 요청됨.
-- v1은 무거운 워크플로 엔진 없이: 제출 폼 + 관리자 수신함 정도로 가볍게 시작한다.

alter table boards add column if not exists min_rank_to_propose integer references membership_tiers(rank);

create table if not exists board_proposals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  -- EPIC-161 Phase 2 후속: 실로플래닛처럼 게시판이 아닌 대상에 대한 제안도 담기
  -- 위해 nullable로 변경(원래는 not null) — null이면 게시판과 무관한 사이트
  -- 전반 제안(kind='planet' 등).
  board_id uuid references boards(id) on delete cascade,
  post_id uuid references posts(id) on delete set null,
  kind text not null default 'other' check (kind in ('write', 'category', 'delete_post', 'planet', 'other')),
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references members(id)
);

create index if not exists board_proposals_status_idx on board_proposals (status, created_at);

alter table board_proposals enable row level security;

create policy "board_proposals_own_insert" on board_proposals for insert
  with check (exists (select 1 from members where members.id = board_proposals.member_id and members.auth_user_id = auth.uid()));

create policy "board_proposals_own_select" on board_proposals for select
  using (exists (select 1 from members where members.id = board_proposals.member_id and members.auth_user_id = auth.uid()));

create policy "board_proposals_admin_all" on board_proposals for all
  using (exists (select 1 from members where members.auth_user_id = auth.uid() and members.is_admin = true))
  with check (exists (select 1 from members where members.auth_user_id = auth.uid() and members.is_admin = true));
