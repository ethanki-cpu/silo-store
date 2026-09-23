-- HOTFIX-161.8(사용자 신고, 2026-09-23): "멤버십 권한 페이지에 카테고리별로
-- 누락된 게시판이 많다" — 실제 원인 조사 결과, 아래 8개 페이지는 이미
-- "board" 위젯이 배치돼 있었지만 board_id가 한 번도 연결된 적 없어서
-- 실제 방문자 화면에는 "게시판이 연결되지 않았어요." 안내문만 보이고
-- 있었다(PageBuilderRenderer.tsx case "board": board_id ? <BoardModule/> :
-- <EmptyState .../>) — 그래서 /admin/board-permissions에도(연결된 board가
-- 없으니 나열할 게 없어서), /membership 하이라이트에도 전혀 안 잡혔다.
--
-- 사용자가 직접 지목한 3곳 + 같은 조사(page_modules에서 module_type='board'
-- and board_id is null인 모든 native 페이지)로 찾은 나머지를 합쳐 8개:
--   About Silo > 사일로의 취향(허브 자신) + 하위 5개(플레이리스트/맛집/책/
--   장소/아이템들 — "전시"만 이미 연결돼 있었음) + 수미의 good n book n
--   사일로 상점 > 사일로 보물들(허브 자신 — 하위 5개는 이미 연결돼 있었음)
--
-- 새 게시판은 전부 등급 게이트 없이(min_rank_to_* 전부 null = 전 등급 공개)
-- 생성한다 — 관리자가 /admin/board-permissions에서 원하는 등급별 권한을
-- 직접 설정하는 게 이 저장소의 표준 흐름(EPIC-161)이라 여기서 임의로
-- 등급을 정하지 않는다.
--
-- 조사 중 별도로 발견(이번엔 안 건드림, 사용자 확인 필요 — CHANGELOG/NEXT_TASK 참고):
--   - 마이페이지 > My Collections/My Story/My Timeline 하위 20개도 같은
--     증상(board_id null)이지만, 이건 "회원 개인 소유 페이지"라 공용
--     게시판 모델이 안 맞는다고 이미 이전 세션(NEXT_TASK.md)에서 별도
--     설계가 필요하다고 기록돼 있어 임의로 게시판을 만들지 않았다.
--   - 살롱데상 > 아카이브/갤러리/멤버십/요일별클럽/주제별클럽A/B 6개
--     허브 페이지 자신도 같은 증상이지만, 이 6개는 하위 항목들이 이미
--     전부 정상 연결돼 있어(허브는 그냥 분류용) 허브 자신에게도 별도
--     게시판이 필요한지 불확실해 사용자 확인 후 처리.
--   - 스튜디오 > 기억의 습작은 EPIC.md에 "설계 자체가 없음"으로 이미
--     기록된 미착수 기능이라 그대로 둠.

insert into boards (id, name, category, slug, board_type, is_public) values
  ('401531e8-c3ae-45e0-9581-c0c549a43386', '사일로의 취향', 'silo-favorites', 'silo-favorites', 'topic', true),
  ('bccf0dfb-0ebd-4b95-95a1-cd662cdfe66b', '사일로의 책', 'silo-book-reviews', 'silo-book-reviews', 'topic', true),
  ('5b965dd4-8eb0-4623-a98d-3d2ae6deab36', '사일로의 아이템들', 'silo-items', 'silo-items', 'topic', true),
  ('79c8fbe4-ed5f-479c-8ef2-6d25c722607f', '사일로의 장소', 'silo-places', 'silo-places', 'topic', true),
  ('1b30daa2-6b5c-495f-b0c3-e7f2602b213f', '사일로의 플레이리스트', 'silo-playlists', 'silo-playlists', 'topic', true),
  ('0dd745b7-192b-487b-9df0-5bddf0587a76', '사일로의 맛집', 'silo-restaurants', 'silo-restaurants', 'topic', true),
  ('471028b0-61c3-4945-b3f1-0b8ec19e3cb6', '수미의 good n book n', 'sumi-good-n-book-n', 'sumi-good-n-book-n', 'topic', true),
  ('15efbfc6-9880-4ce1-9914-55523c1320b2', '사일로 보물들', 'silo-store-treasures-hub', 'silo-store-treasures-hub', 'topic', true);

update page_modules set board_id = '401531e8-c3ae-45e0-9581-c0c549a43386' where id = '4fa45d10-ee84-4226-b02c-d94811104e48';
update page_modules set board_id = 'bccf0dfb-0ebd-4b95-95a1-cd662cdfe66b' where id = '810459ad-440d-440b-9512-5b4fcdd247c6';
update page_modules set board_id = '5b965dd4-8eb0-4623-a98d-3d2ae6deab36' where id = '3b1b2bf7-e9fe-4e01-a4ba-21c6f656d543';
update page_modules set board_id = '79c8fbe4-ed5f-479c-8ef2-6d25c722607f' where id = '8f073e1a-8465-43c1-80fa-74339aa95dda';
update page_modules set board_id = '1b30daa2-6b5c-495f-b0c3-e7f2602b213f' where id = '4f0438df-abfe-461d-a956-d050b6a91b81';
update page_modules set board_id = '0dd745b7-192b-487b-9df0-5bddf0587a76' where id = 'e17fac4d-bba4-4ed1-ad3e-13f277f9ae51';
update page_modules set board_id = '471028b0-61c3-4945-b3f1-0b8ec19e3cb6' where id = 'e25b849d-dbf8-4714-8161-5471a679ec08';
update page_modules set board_id = '15efbfc6-9880-4ce1-9914-55523c1320b2' where id = '3fa74646-919a-47a8-a655-a201f7cb54d4';
