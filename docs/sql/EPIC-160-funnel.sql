-- EPIC-160: 무료(Silo Angel) 유입 → 유료 전환 퍼널 장치.
-- 1) 가입 웰컴 포인트(500P) 2) Lautrec 전용 라운지 게시판 3) 퍼널 집계 뷰(관리자/Management API 조회용)

-- 1) 웰컴 포인트: 회원 행이 만들어지면 자동 적립(SECURITY DEFINER 트리거 — 클라이언트가 임의로 적립할 수 없다).
alter table points_ledger drop constraint if exists points_ledger_reason_check;
alter table points_ledger add constraint points_ledger_reason_check
  check (reason in ('post','comment','like_received','best_post','shop_purchase','shop_rental','venue_rental','club_participation','attendance','membership_subscription','welcome_bonus'));

create or replace function members_welcome_bonus() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into points_ledger (member_id, reason, points, related_id) values (new.id, 'welcome_bonus', 500, null);
  return new;
end $$;
drop trigger if exists trg_members_welcome_bonus on members;
create trigger trg_members_welcome_bonus after insert on members for each row execute function members_welcome_bonus();

-- 2) Lautrec 전용 라운지: 읽기·쓰기 모두 Lautrec(4) 이상(관리자/Artist 99 포함). 쓰기 게이트는 canWriteToBoard가, 읽기 게이트는 canReadBoard가 min_rank_*로 강제한다.
insert into boards (name, slug, category, board_type, min_rank_to_read, min_rank_to_write, is_public, sort_order, description)
select 'Lautrec 라운지', 'lautrec-lounge', 'lautrec-lounge', 'topic', 4, 4, true, 53, 'Lautrec 등급 이상만 읽고 쓸 수 있는 전용 라운지'
where not exists (select 1 from boards where slug = 'lautrec-lounge');

-- 3) 퍼널 집계(관리자만 — 클라이언트 역할에는 권한을 주지 않는다): 가입 → 활동 → 유료.
create or replace view membership_funnel as
select
  count(*) as members_total,
  count(*) filter (where joined_at > now() - interval '30 days') as signups_30d,
  count(*) filter (where exists (select 1 from points_ledger p where p.member_id = m.id and p.reason in ('post', 'comment'))) as members_with_post_or_comment,
  count(*) filter (where membership_rank > 0) as members_paid_or_higher,
  count(*) filter (where membership_rank = 0) as members_free
from members m;
revoke all on membership_funnel from anon, authenticated;
