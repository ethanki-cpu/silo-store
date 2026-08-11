-- HOTFIX-093-B(요구사항 1.2): 게시글 다중 게시판 소속(N:M).
--
-- 설계: 기존 posts.board_id(단일, NOT NULL 아님)는 그대로 "주 게시판"
-- 역할을 유지한다 — URL 라우팅(/boards/[board_slug]/[post_slug]),
-- 작성자 판정, "게시판 옮기기" 이동 로직(epic-079-phase-4-post-board-move
-- -grant.sql의 posts_protect_content_columns 트리거), (board_id, slug)
-- UNIQUE 인덱스(epic-079-phase-2-slug.sql)가 전부 이 단일 컬럼에 의존하고
-- 있어 걷어내면 라우팅/권한/트리거를 전부 다시 설계해야 하는 훨씬 큰
-- 파괴적 변경이 된다. 대신 "이 글이 추가로 노출될 게시판" 목록만 별도
-- 매핑 테이블로 얹는다(주 게시판은 post_boards에도 함께 넣지 않음 —
-- posts.board_id 하나로 이미 충분하고, 중복 저장하면 "옮기기" 때
-- 두 군데를 항상 같이 갱신해야 하는 불일치 위험이 생긴다).
--
-- 읽는 쪽(게시판 글 목록/캘린더 등)은 "board_id = X 인 글" UNION
-- "post_boards에 board_id = X로 연결된 글"로 합쳐서 보여준다(애플리케이션
-- 코드에서 처리, 이 SQL은 스키마만 만든다).

create table if not exists post_boards (
  post_id    uuid not null references posts(id) on delete cascade,
  board_id   uuid not null references boards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, board_id)
);

create index if not exists idx_post_boards_board on post_boards(board_id);
create index if not exists idx_post_boards_post on post_boards(post_id);

alter table post_boards enable row level security;

-- 공개 조회 허용 — 실제 접근 제어(등급 게이팅 등)는 posts/boards 자체의
-- RLS/애플리케이션 레이어(canReadBoard)가 이미 담당하므로, 이 매핑
-- 테이블 자체는 "어느 글이 어느 게시판에도 걸려 있는지"만 공개해도 안전.
drop policy if exists post_boards_select on post_boards;
create policy post_boards_select on post_boards
  for select using (true);

-- 쓰기(추가/삭제): 그 글의 작성자 본인이거나 관리자만 — CLAUDE.md에 문서화된
-- 기존 patterns(epic-053-1.sql/epic-079-phase-1.sql)와 동일한 관용구
-- (posts.author_id in (select id from members where auth_user_id = auth.uid()))를
-- 그대로 쓴다. is_admin 체크는 post_boards→members 조회일 뿐 members
-- 테이블 자기 자신을 다시 참조하지 않으므로(CLAUDE.md에 문서화된 자기참조
-- 재귀 버그와는 무관한 형태) 안전하다.
drop policy if exists post_boards_insert on post_boards;
create policy post_boards_insert on post_boards
  for insert to authenticated
  with check (
    exists (
      select 1 from posts p
      where p.id = post_boards.post_id
        and (
          p.author_id in (select id from members where auth_user_id = auth.uid())
          or exists (select 1 from members m where m.auth_user_id = auth.uid() and m.is_admin = true)
        )
    )
  );

drop policy if exists post_boards_delete on post_boards;
create policy post_boards_delete on post_boards
  for delete to authenticated
  using (
    exists (
      select 1 from posts p
      where p.id = post_boards.post_id
        and (
          p.author_id in (select id from members where auth_user_id = auth.uid())
          or exists (select 1 from members m where m.auth_user_id = auth.uid() and m.is_admin = true)
        )
    )
  );

-- 검증(실행 후 확인용, 0행이 정상):
-- select * from post_boards limit 5;
