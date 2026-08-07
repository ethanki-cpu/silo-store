-- EPIC-089: 유튜브 스타일 대댓글 + 댓글 좋아요 + 작성자 아바타 노출
--
-- 1) comments.parent_id — 대댓글(답글). 유튜브처럼 딱 1단계 들여쓰기만
--    쓰므로(답글에 또 답글을 달면 "누구에게" 라벨만 붙고 더 깊이 들어가지
--    않음), parent_id는 항상 "최상위 댓글"을 가리킨다 — 애플리케이션
--    코드가 답글의 답글을 달 때 parent_id를 그 답글의 parent_id(또는 자기
--    자신이 최상위면 자기 id)로 넣는 방식으로 이 불변식을 유지한다(DB
--    CHECK로 강제하지는 않음 — 셀프 조인 CHECK는 Postgres가 지원하지 않음).
alter table comments add column if not exists parent_id uuid references comments(id) on delete cascade;
create index if not exists idx_comments_parent on comments(parent_id);
create index if not exists idx_comments_post on comments(post_id);

-- 2) comment_likes — posts에 이미 있는 likes 테이블과 동일한 own-row
--    insert/delete + 공개 select 패턴(CLAUDE.md Row Level Security 절
--    참고). likes_count는 별도 컬럼으로 들고 있지 않고 이 테이블을 count()
--    해서 구한다(posts.like_count 같은 트리거 유지 캐시가 필요할 만큼 이
--    기능의 트래픽이 크지 않다고 판단 — 필요해지면 나중에 추가).
create table if not exists comment_likes (
  id          uuid primary key default gen_random_uuid(),
  comment_id  uuid not null references comments(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (comment_id, member_id)
);

alter table comment_likes enable row level security;

drop policy if exists "comment_likes select all" on comment_likes;
create policy "comment_likes select all" on comment_likes for select using (true);

drop policy if exists "comment_likes insert own" on comment_likes;
create policy "comment_likes insert own" on comment_likes for insert with check (
  member_id in (select id from members where auth_user_id = auth.uid())
);

drop policy if exists "comment_likes delete own" on comment_likes;
create policy "comment_likes delete own" on comment_likes for delete using (
  member_id in (select id from members where auth_user_id = auth.uid())
);

grant select, insert, delete on comment_likes to authenticated;
grant select on comment_likes to anon;

-- 3) public_profiles에 avatar_url 추가 — members.avatar_url은 EPIC-087-
--    PHASE-F에서 이미 추가돼 있다. 댓글 작성자 얼굴을 보여주려면 다른
--    회원의 이 값을 읽어야 하는데, members 테이블 자체는 본인 행만 읽을 수
--    있어(own-row RLS) 지금까지처럼 public_profiles 뷰를 거쳐야 한다.
create or replace view public_profiles as select id, name, avatar_url from members;
grant select on public_profiles to anon, authenticated;
