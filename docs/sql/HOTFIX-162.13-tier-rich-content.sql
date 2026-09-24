-- HOTFIX-162.13: 멤버십 카드 소개/편지를 리치 에디터(Block Editor)로 편집 + 편지 디자인 + 등급별 이미지 표시 설정
-- 기존 intro_text/letter_text(평문)는 그대로 두고, *_html이 비어 있으면 평문으로 폴백 렌더링한다.
alter table membership_tiers
  add column if not exists intro_json jsonb,
  add column if not exists intro_html text,
  add column if not exists letter_json jsonb,
  add column if not exists letter_html text,
  add column if not exists letter_style jsonb,
  add column if not exists media_settings jsonb;

-- 캐러셀 위젯 설정 기본값 병합(기존 값 우선) — 페이지 수정 인스펙터에 새 항목의 현재 값이 채워져 보이게.
update page_modules m set settings = '{"layout":"stack","textAlign":"center","cardMaxWidthPx":672,"cardBackground":"","cardRadiusPx":12,"cardBorder":true,"accentColor":"","nameSizePx":26,"mediaWidthPx":260,"mediaAspect":"4:5","mediaFit":"contain","mediaRadiusPx":10,"mediaBorder":true,"mediaBackground":"","showTabs":true,"showArrows":true,"showPrice":true,"showSummary":true,"showJoin":true}'::jsonb || m.settings
from page_builder p where p.id = m.page_id and p.slug = 'membership' and m.module_type = 'membership_carousel';
