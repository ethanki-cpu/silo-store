-- HOTFIX-167.5: 캐러셀 맨 위 말풍선 문구를 "어떤 ‘사일로의 멤버’가 되고 싶나요?"로. 재실행 안전.
update page_modules m set settings = jsonb_set(m.settings, '{heading}', '"어떤 ‘사일로의 멤버’가 되고 싶나요?"')
from page_builder p where p.id = m.page_id and p.slug = 'membership' and m.module_type = 'membership_carousel';
