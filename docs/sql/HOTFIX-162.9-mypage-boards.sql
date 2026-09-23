-- HOTFIX-162.9(사용자 지시): 마이페이지 > 나의 수집품들/나의 이야기/나의 타임라인 및 그 하위 카테고리(페이지)에
-- "게시판이 연결되지 않았어요" 빈 board 위젯만 있어 권한 설정 페이지에 안 나왔다 — 카테고리 이름과 같은 이름의
-- 게시판을 만들어 그 빈 위젯에 연결한다(등급 게이트는 비워 둠 — /admin/board-permissions에서 설정).
do $$
declare
  r record;
  new_id uuid;
  b_name text;
  b_slug text;
begin
  for r in
    select pm.id as module_id, pb.slug as page_slug,
           (select trim(sn.title) from site_navigations sn
             where lower(replace(trim(both '/' from sn.href), '/', '-')) = pb.slug limit 1) as nav_title
      from page_modules pm
      join page_builder pb on pb.id = pm.page_id
     where pm.module_type = 'board' and pm.board_id is null
       and pb.builder_type = 'native' and pb.slug like 'mypage-%'
  loop
    b_name := coalesce(r.nav_title, r.page_slug);
    b_slug := r.page_slug;
    new_id := gen_random_uuid();
    insert into boards (id, name, category, slug, board_type, is_public)
    values (new_id, b_name, b_slug, b_slug, 'topic', true);
    update page_modules set board_id = new_id where id = r.module_id;
  end loop;
end $$;
