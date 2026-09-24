-- HOTFIX-162.10: /membership 위젯 설정 시딩(이미 Management API로 실행됨, 기록용·재실행 안전)
-- membership_carousel: 카드 안 혜택 요약 표시 옵션 / membership_plans: 등급별 소개 카드 숨김(캐러셀 카드와 같은 정보라 중복)
update page_modules m set settings = case m.module_type
  when 'membership_carousel' then '{"heading":"멤버십 혜택 한눈에 보기","subtitle":"옆으로 넘기며 등급마다 열리는 세계를 비교해 보세요. 높은 등급은 낮은 등급의 혜택을 모두 포함해요.","showCategories":true,"showFullList":true,"showNotes":true,"showLetter":true,"excludeCategories":"스튜디오","commonNotes":"사일로 상점 물품 구매 시 포인트 적립"}'::jsonb
  else '{"showPlanCards":false}'::jsonb end
from page_builder p
where p.id = m.page_id and p.slug = 'membership' and m.module_type in ('membership_carousel','membership_plans');
