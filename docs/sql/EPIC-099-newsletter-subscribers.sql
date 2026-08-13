-- EPIC-099(항목 1, 최소 범위): 뉴스레터 이메일 저장 전용 테이블 — 발송
-- 채널(Resend 등) 연동은 스코프 밖, 여기서는 "누가 구독했는지 저장"까지만.
-- 로그인 여부와 무관하게 누구나 구독할 수 있어야 해서(비회원 이메일도 받음)
-- members에 옵트인 플래그를 추가하는 대신 독립 테이블로 분리한다.
-- 이미 Management API로 즉시 실행 완료(라이브 반영됨, 2026-08-13).

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table newsletter_subscribers enable row level security;

-- 공개 구독 폼이라 로그인 없이 누구나 자기 이메일을 등록/재구독할 수 있어야
-- 한다 — 이메일 인증 루프가 없는 최소 범위라 "그 이메일 주인이 맞는지"는
-- 검증하지 않는다(다른 사람 이메일을 등록당할 수 있는 낮은 리스크를
-- 감수하는 트레이드오프, 발송 연동 시점에 재검토).
create policy "newsletter_public_insert" on newsletter_subscribers for insert
  with check (true);

-- 재구독(이미 존재하는 email로 다시 신청) 대비 update도 열어는 두지만, 실제
-- API 라우트(POST /api/newsletter/subscribe)는 이걸 안 쓴다 — upsert(INSERT
-- ON CONFLICT DO UPDATE)는 충돌 행을 확인하려고 내부적으로 SELECT RLS까지
-- 통과해야 하는데 SELECT는 관리자 전용이라 anon 요청이 42501로 막히는 걸
-- 로컬에서 직접 재현 확인했다(Postgres의 알려진 동작 — ON CONFLICT DO UPDATE
-- 경로는 UPDATE 정책뿐 아니라 SELECT 정책까지 필요). 그래서 라우트는 평범한
-- insert만 하고 unique 위반(23505, 이미 구독 중)을 성공으로 처리한다 — 이
-- update 정책은 나중에 구독 해지/재개 플로우를 만들 때를 대비해 남겨둔다.
create policy "newsletter_public_resubscribe" on newsletter_subscribers for update
  using (true)
  with check (true);

-- 이메일 목록 조회는 관리자만 — members.is_admin exists 서브쿼리는 members
-- 테이블 자체를 대상으로 하지 않는 한 재귀 문제가 없다(CLAUDE.md RLS
-- 섹션의 기존 admin-bypass 패턴과 동일).
create policy "newsletter_admin_select" on newsletter_subscribers for select
  using (exists (select 1 from members where members.auth_user_id = auth.uid() and members.is_admin = true));
