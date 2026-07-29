-- EPIC-066: Board Widget 실데이터 연결 감사 중 발견한 2건.
-- 사용자가 제공한 Supabase Management API 토큰으로 이미 직접 실행
-- 완료했다(2026-07-29) — 이 파일은 기록용이며, 재실행해도 안전하다.

-- 1. treasures 페이지의 Gallery 위젯이 board_id 없이 방치돼 있었다.
--    실제로 존재하는 게시판 중 "Treasures"(사일로 보물들) 주제와 가장
--    가까운 게시판은 "After Adoption 분양 후 이야기"(adoption_story
--    타입) 하나뿐이라 그 게시판에 연결했다.
update page_modules
set board_id = '9645e2c9-fb60-423a-a024-a4e56d41dd68'
where id = '3fdbb257-1148-4633-ba8f-e279e2145481'
  and board_id is null;

-- 2. gallery 페이지에 board_id 없는 죽은 Gallery 위젯이 하나 더
--    있었다 — 같은 페이지에 이미 5개 버튼 위젯(시상식/공연/파티/방문자/
--    패트론)이 하위 갤러리로 링크를 걸고 있어 내용상 중복이고, 연결할
--    "전체 갤러리 종합" 게시판도 존재하지 않아 삭제했다.
delete from page_modules
where id = '2f506f98-13bd-452f-8a26-c88897c2a5f7';
