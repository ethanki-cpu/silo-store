-- EPIC-168: Owner(rank 100) 최상위 등급 — Lautrec(4) 행을 복사해 만들고 이름/가격/평생 플래그만 바꾼다. 공개 요금제·캐러셀에는 코드에서 rank>=100을 제외한다. 재실행 안전.
insert into membership_tiers
select (jsonb_populate_record(null::membership_tiers, to_jsonb(t) || '{"rank":100,"name":"Owner","price":0,"is_lifetime":true}'::jsonb)).*
from membership_tiers t
where t.rank = 4 and not exists (select 1 from membership_tiers where rank = 100);

-- ethanki@silostore.net = Owner + 관리자
update members set membership_rank = 100, is_admin = true
where auth_user_id = (select id from auth.users where email = 'ethanki@silostore.net');
