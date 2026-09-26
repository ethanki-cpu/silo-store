-- HOTFIX-165.3: 상단 '멤버십 가입' 버튼 문구를 'Members'로(labels.join). 사용자가 문구를 넣으려 '서체' 칸에 입력해 둔 "Members"(존재하지 않는 글꼴)는 비운다. 재실행 안전.
update site_settings
set setting_value = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(setting_value, '{labels}', coalesce(setting_value->'labels', '{}'::jsonb) || '{"join":"Members"}'::jsonb),
      '{pc,fontFamily}', case when setting_value#>>'{pc,fontFamily}' = 'Members' then '""'::jsonb else coalesce(setting_value#>'{pc,fontFamily}', '""'::jsonb) end),
    '{tablet,fontFamily}', case when setting_value#>>'{tablet,fontFamily}' = 'Members' then '""'::jsonb else coalesce(setting_value#>'{tablet,fontFamily}', '""'::jsonb) end),
  '{mobile,fontFamily}', case when setting_value#>>'{mobile,fontFamily}' = 'Members' then '""'::jsonb else coalesce(setting_value#>'{mobile,fontFamily}', '""'::jsonb) end)
where setting_key = 'account_menu_style';
