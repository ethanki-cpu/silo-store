-- HOTFIX-166.2: Depth 1(Silo Angel)·3(Gatsby)은 그림 전체가 보이게(contain), Depth 1 문을 키우고(높이 68%·폭 62%), Depth 6(Artist)은 위→아래로 훑기(pan). 재실행 안전.
update page_modules m set settings = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(m.settings,
  '{depths,0,imageFit}', '"contain"'),
  '{depths,0,doorHeightPct}', '68'),
  '{depths,0,doorWidthPct}', '62'),
  '{depths,2,imageFit}', '"contain"'),
  '{depths,5,imageFit}', '"pan"'),
  '{depths,5,imageZoom}', '100')
from page_builder p
where p.id = m.page_id and p.slug = 'membership' and m.module_type = 'membership_depths'
  and jsonb_array_length(m.settings->'depths') >= 6;
