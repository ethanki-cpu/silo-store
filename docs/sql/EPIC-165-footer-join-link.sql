-- EPIC-165: 푸터 링크 줄에 "멤버십 가입" 추가(page_builder slug='footer'의 craft_state, jsonb 안에 JSON 문자열로 저장돼 있음). 재실행 안전.
update page_builder
set craft_state = to_jsonb(
  jsonb_set(
    (craft_state #>> '{}')::jsonb,
    '{wiQ_K5CY0b,props,items}',
    ((craft_state #>> '{}')::jsonb #> '{wiQ_K5CY0b,props,items}') || '[{"href":"/membership","label":"멤버십 가입"}]'::jsonb
  )::text
)
where slug = 'footer' and (craft_state #>> '{}') not like '%멤버십 가입%';
