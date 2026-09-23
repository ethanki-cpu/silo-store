-- HOTFIX-161.9(사용자 지시, 2026-09-24):
-- (1) "이전 주인의 사연"(사일로의 원래 주인들/Grandmas/Grandpas) 전용 별도 하루 한도.
--     게시판별 한도(daily_view_limits)는 게시판마다 따로 세는데, 이 3개는 "하나의
--     사연 묶음"이라 합쳐서 하루 N개여야 한다 — boards.daily_limit_group으로 같은
--     그룹의 게시판들이 한도를 공유하게 한다. 값: Patron(3)=2, Lautrec(4)=2
--     (마스터플랜은 Patron 하루 2개만 명시 — 기존엔 Patron 무제한/Lautrec 1이라
--     Lautrec이 Patron보다 낮아지는 역전이 있었다. Lautrec 값은 Patron과 같게 뒀다).
-- (2) 멤버십 캐러셀: 등급별 애니메이션 URL/소개/편지/미션 질문(관리자 편집) +
--     회원의 미션 답변 저장 테이블(마이페이지에 노출).

alter table boards add column if not exists daily_limit_group text;

update boards
   set daily_limit_group = 'original_owner_stories',
       daily_view_limits = '{"3":2,"4":2}'::jsonb
 where slug in ('grandmas', 'grandpas', 'silo-story');

alter table membership_tiers
  add column if not exists animation_url text,
  add column if not exists intro_text text,
  add column if not exists letter_text text,
  add column if not exists mission_questions jsonb not null default '[]'::jsonb;

create table if not exists membership_mission_answers (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references members(id) on delete cascade,
  tier_rank     int  not null,
  question_id   text not null,
  question_text text not null,
  answer_text   text,
  answer_photo_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (member_id, tier_rank, question_id)
);

alter table membership_mission_answers enable row level security;

create policy "mission_answers_own_select" on membership_mission_answers for select
  using (exists (select 1 from members m where m.id = member_id and m.auth_user_id = auth.uid()));
create policy "mission_answers_own_insert" on membership_mission_answers for insert
  with check (exists (select 1 from members m where m.id = member_id and m.auth_user_id = auth.uid()));
create policy "mission_answers_own_update" on membership_mission_answers for update
  using (exists (select 1 from members m where m.id = member_id and m.auth_user_id = auth.uid()))
  with check (exists (select 1 from members m where m.id = member_id and m.auth_user_id = auth.uid()));
create policy "mission_answers_admin_select" on membership_mission_answers for select
  using (exists (select 1 from members m where m.auth_user_id = auth.uid() and m.is_admin = true));
