-- EPIC-084-REVISED §1.4: "사이트 메뉴 URL 정돈" — "사이트 구성 관리"의
-- "미분류 페이지" 버킷에 쌓여있던 ~53개 항목 중, 실제 위젯 콘텐츠가 전혀
-- 없는(page_modules 0건) 항목만 골라 삭제한다. 이 항목들은 EPIC-064A가
-- 모든 라우트에 기계적으로 부착한 PageEditButton의 slug만 존재하고 실제로
-- PageBuilderRenderer를 호출하지 않는 client-fetch 페이지들(예: /boards,
-- /clubs, /login, /settings 등)이 ensureUnassignedPagesInTree()에 의해
-- "미분류 페이지"로 잘못 흡수된 것 — 콘텐츠가 없어 삭제해도 아무것도
-- 잃지 않는다(같은 이유로 CategoryTreeManager.tsx도 앞으로 위젯이 0개인
-- 페이지는 이 버킷에 흡수하지 않도록 함께 수정됨).
--
-- 위젯이 1개 이상 있는 나머지 항목(예: Gallery Awards/Parties, Archive
-- Brochure/Posters, Membership *, Shop Heritage Grandma/Grandpa 등)은
-- EPIC-080이 그림자 정적 페이지 파일만 삭제하고 그 밑에 깔려있던
-- page_builder 콘텐츠는 정리하지 않고 남긴 것으로 추정된다 — 실제 콘텐츠가
-- 들어있어 이번엔 손대지 않았다(docs/navigation-blueprint.md §9 "개별 검토
-- 필요"에 해당, 사용자 확인 후 별도 정리 필요).

delete from site_navigations
where parent_id = (select id from site_navigations where key = '__unassigned_pages__')
  and id in (
    select sn.id
    from site_navigations sn
    left join page_builder pb on pb.slug = trim(leading '/' from sn.href)
    left join page_modules pm on pm.page_id = pb.id
    where sn.parent_id = (select id from site_navigations where key = '__unassigned_pages__')
    group by sn.id
    having count(pm.id) = 0
  );
