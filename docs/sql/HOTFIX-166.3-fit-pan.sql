-- HOTFIX-166.3: Depth 1(Angel)·3(Gatsby) 배경을 Alice와 같은 pan(가로를 화면에 꽉 채우고 위→아래로 훑기)으로. 재실행 안전.
update page_modules m set settings = jsonb_set(jsonb_set(m.settings, '{depths,0,imageFit}', '"pan"'), '{depths,2,imageFit}', '"pan"')
from page_builder p
where p.id = m.page_id and p.slug = 'membership' and m.module_type = 'membership_depths' and jsonb_array_length(m.settings->'depths') >= 3;
