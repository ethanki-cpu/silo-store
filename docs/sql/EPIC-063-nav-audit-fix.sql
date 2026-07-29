-- EPIC-063: Navigation Audit — site_navigations 전체 검사 결과, 유일하게
-- 깨져 있던 행(href = null)을 수정한다.
--
-- 대상: "입양신청서 라이브러리" (사일로상점 > 사일로 보물들 하위 항목).
-- 전용 페이지가 없어(별도 "입양 신청서" 기능/라우트가 존재하지 않음)
-- 형제 항목인 "보물 목록"과 같은 /shop으로 임시 연결한다 — 실제 의도된
-- 목적지를 관리자가 더 잘 알 수 있으므로, 다른 목적지가 맞다면 이 UPDATE의
-- href 값만 바꿔서 다시 실행하면 된다.
update public.site_navigations
set href = '/shop'
where id = '33ac27f9-8f29-464c-a9ba-aef7d770b3c8'
  and title = '입양신청서 라이브러리'
  and href is null;
