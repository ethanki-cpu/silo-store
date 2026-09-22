-- HOTFIX-161.7(사용자 지시, 2026-09-23):
-- (1) 멤버십 등급마다 "대표 사진"을 올릴 수 있게 image_url 컬럼 추가.
-- (2) 온라인 도슨트 단품 가격을 "콘텐츠 정가 * (1-할인율)" 방식에서
--     "등급별 고정가 + 등급별 하루 무료 열람 건수" 방식으로 전면 교체.
--     사용자가 준 규칙: 비회원 3000원(계정 없이는 애초에 구매 API를 호출할
--     수 없어 화면 표시용 기준가로만 쓰임, DB 행 없음) / Silo Angel(rank0)
--     2000원 / Alice(rank1) 1000원, 무료건수 없음 / Great Gatsby(rank2)
--     하루 1개 무료+이후 1000원 / Patron(rank3) 하루 2개 무료+이후 1000원 /
--     Lautrec(rank4) 하루 3개 무료+이후 1000원. Artist(rank99)는 사용자가
--     명시하지 않아 Lautrec과 동일(하루 3개+1000원)로 맞춰뒀다 — 다르게
--     원하면 알려주면 바꾼다.
--
-- 기존 docent_free_only/docent_per_item_discount_pct/docent_monthly_free_count
-- 컬럼은 삭제하지 않는다(다른 화면이 참조할 수도 있고, 파괴적 변경은
-- 사용자가 명시적으로 요청할 때만 하는 게 이 저장소 원칙) — 다만
-- /api/docent-purchases의 실제 가격 계산은 이 새 컬럼만 쓰도록 바꾼다.

alter table membership_tiers
  add column if not exists image_url text,
  add column if not exists docent_flat_price int,
  add column if not exists docent_daily_free_count int not null default 0;

update membership_tiers set docent_flat_price = 2000, docent_daily_free_count = 0 where rank = 0;
update membership_tiers set docent_flat_price = 1000, docent_daily_free_count = 0 where rank = 1;
update membership_tiers set docent_flat_price = 1000, docent_daily_free_count = 1 where rank = 2;
update membership_tiers set docent_flat_price = 1000, docent_daily_free_count = 2 where rank = 3;
update membership_tiers set docent_flat_price = 1000, docent_daily_free_count = 3 where rank = 4;
update membership_tiers set docent_flat_price = 1000, docent_daily_free_count = 3 where rank = 99;

-- 하루 무료 열람 건수 추적용 — is_monthly_free(월간, 기존)과 별개로
-- is_daily_free(일간, 신규)를 추가한다. 자정 기준 오늘 발급된 is_daily_free
-- 행 수만 세면 하루 한도 판정이 된다(post_views의 daily_view_limits와
-- 같은 자정 기준 UTC+9 계산 방식은 API 코드에서 처리 — 이 컬럼 자체는
-- 그냥 불리언 플래그).
alter table docent_purchases
  add column if not exists is_daily_free boolean not null default false;
