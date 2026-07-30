-- EPIC-075: 관리자 CMS 트리(페이지 관리/게시판 관리)에 드래그앤드롭 순서
-- 변경을 추가하기 위해 필요한 컬럼. `site_navigations.sort_order`는 이미
-- 존재하므로(카테고리/브랜치 순서 변경은 그 컬럼을 그대로 씀) 여기서는
-- `page_builder`/`boards` 두 테이블에만 신규 컬럼을 추가한다.
--
-- 실행 방법: Supabase SQL Editor에서 그대로 실행(재실행해도 안전 —
-- `add column if not exists`).

alter table page_builder
  add column if not exists sort_order int not null default 0;

alter table boards
  add column if not exists sort_order int not null default 0;

-- 기존 행에 안정적인 초기 순서를 부여한다(전부 sort_order=0인 상태로
-- 시작하면 관리자 화면에서 순서가 죄다 뒤섞여 보이므로, 드래그앤드롭을
-- 시작할 합리적인 기준선을 만들어준다). page_builder는 created_at이
-- 있어 생성 순서 그대로, boards는 created_at 컬럼이 없어 이름 가나다순을
-- 기준선으로 삼는다 — 어느 쪽이든 관리자가 이후 드래그로 자유롭게
-- 재배열하면 그만이라 "정답"이 아니라 "출발점"일 뿐이다.

with ordered as (
  select id, row_number() over (order by created_at) as rn
  from page_builder
)
update page_builder
set sort_order = ordered.rn
from ordered
where page_builder.id = ordered.id
  and page_builder.sort_order = 0;

with ordered as (
  select id, row_number() over (order by name) as rn
  from boards
)
update boards
set sort_order = ordered.rn
from ordered
where boards.id = ordered.id
  and boards.sort_order = 0;
