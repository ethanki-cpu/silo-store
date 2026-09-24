-- EPIC-163: 등급별 소개 원문 시딩(PROJECT_VISION.md 원문 그대로, 비어 있는 등급만) + 미션 질문 + /membership 위젯 배치. 실행 완료, 재실행 안전.
update membership_tiers set intro_text = $t$이상한 나라의 앨리스 처럼
사일로 상점 & 살롱데상 에 빠진 모두들 !

'살맛나는 커뮤니티' 의 일원이 되어
수많은 취향의 방을 열며
또다른 나를 발견해 보아요!$t$ where rank = 1 and (intro_text is null or intro_text = '') and intro_html is null;
update membership_tiers set intro_text = $t$사랑을 가장한 자아실현 이라는
모순된 세상속 우리는 모두 위대한 개츠비를 닮았죠 !

조금 더 위험하게 하지만 필연적으로
순수함과 퇴폐미를 동시에 간직한
사람들에게 더 순수한 욕망과
오늘만 사는것 같은 흔적 남기기 !

Cheers$t$ where rank = 2 and (intro_text is null or intro_text = '') and intro_html is null;
update membership_tiers set intro_text = $t$르네상스는 이름 없는 직인에 불과했던 화가나 조각가를
"예술가"로 탄생 시킨 시기에요.

예술가 개인의 역량이 주목 받게 되고
사회에 받아들여 지게 됐다는 것은
예술가의 지원해 창의적 활동의 터전을 마련해주는
보호자, 이들이 바로 패트런(patron)이라 불리는 사람들입니다.

패트런이란 예술 작품의 경제적 물질적 담당자일 뿐 아니라
예술가의 작품세계와 메시지를 이해하고 작품의 가치를 유지하고
공유함으로, 예술가를 지원하는 사람들을 말해요

파트론의 역사는 15세기 전반 피렌체의 동업자조합에서 꽃피었어요.
이어 메디치가(家)등 재력있는 개인 패트런들과,
피렌체의 여러 집안이 예술가의 활동을 여러가지 형태로 원조했는데,
교회당 장식이나 제단화 제작 등 이른바 종교예술이 대부분이었고
이들의 "예술 보호"도 순수한 예술 애호심에 따른 것이기 보다는
오히려 신앙심의 표현이었죠.

미켈란젤로는 교황 율리우스 2세(1443-1513)의 명령이 없었다면
시스티나 예배당의 천장화는 그리려고 생각하지도 않았을 거에요.
또한 프랑스의 프랑수아 1세는
통일국가로 정착한 프랑스의 국왕들 중에선
예술의 패트런이라고 불릴만한 최초의 인물,
레오나르도 다빈치가 그의 가슴에안겨
세상을 떠났다는 "전설"이 사실은 아니더라도
프랑수아 1세(1515-1547)의 강력한 비호 아래
안정되고 편안한 만년을 보내며
"모나리자" "성 안나와 성모자" "세례자 요한"등의 걸작을 남겼어요.
바로크 시대에는 예수회등 교단이나 고위 성직자들이
예술 보호활동에 적극적이었다고 해요.

17세기 네덜란드를 중심으로 시민사회가 형성되고
부유한 시민들이 패트런이 되었어요.
당시 네덜란드에는 전문 화상이 생겨났는데
이들은 일정 기간 화가를 고용해서
임금을 지불하면서 작품을 제작하게 하기도 했는데,
새로운 패트런의 역할을 하게되었어요.



뒤랑 뤼엘, 앙브루아즈 볼라르 등
19세기말 20세기초 화상들은
예술가를 발굴하고 그들의 작품에 매료되어
세상에 알리는 지대한 공헌을 했어요.

각국 정부도 패트런으로서의 역할을 수행하게 되었는데,
특히 컬렉션을 통해 예술을 보호하는것이 프랑스의 전통이었어요.
한국, 프랑스와 미국은
공건축 건설비의 1%를 예술 작품에 할당한다는
"퍼센트 방식"을 실시하고있어요.

🏛️ Salon des Cent Patron 모임

'패트론'은 고대 그리스 때부터
신의 후원을 받아 문명을 키운 사람이,
다시 예술가를 후원하는 '신의 의지'를
따라하는 후원자를 뜻해요. ✨

중세시대와 산업혁명 중에도
예술을 사랑하는 관객이었던
소수의 후원자들 덕분에
예술가들은 계속 창작을 할 수 있었죠. 🎨

후원자들은 아름다움에 영감을 얻어
직접 창작과 공예를 하는 사람이기도 해요.
2026년을 사는 우리들은
모두 예술가이면서 후원자가 될 수 있죠. 🤝💡

🎁 패트론 멤버십 혜택

- 🗝️ 살롱데상 자유 출입 (지인과 함께)
- 🥂 모임, 파티, 공연 우선 초대
- 🛍️ <사일로상점> 구매 5% 할인
- 🎟️ 모임 참여/개최 및 공간 대관 시 할인
- 🎭 1달에 1번 예술적인 "패트론 모임" 초대
- 💬 '패트론' 톡방에서 일상 속 영감 공유!
- 👑 silo 플랫폼 웹/앱 '패트론' 권한
- 📦 매월 사일로에서 만든 굿즈 패키지 증정
- 📜 <살롱데상> 비밀의 방 출입을 위한 "바칼로레아" 시험 기회$t$ where rank = 3 and (intro_text is null or intro_text = '') and intro_html is null;
update membership_tiers set intro_text = $t$가장 낮은 위치에서 세상을 바라봤지만
그 누구보다 위대하게 삶을 애정했던
로트렉의 그림처럼,

우리는 모두 있는 그대로 삶을 기록하며
본질을 아름답게 담아내는
찬란하게 쓸모없는 존재들 !$t$ where rank = 4 and (intro_text is null or intro_text = '') and intro_html is null;
update membership_tiers set intro_text = $t$120여년전 파리에서
자신의 작품을 알리기위해
로트렉, 무하, 드가, 마티스 같은
어린 예술가들이
직접 만든 홍보 포스터로
사람들을 모아 자신들만의
작은 공간에서 독립전시회를
열었던 '살롱데상'.

사일로의 '살롱데상' 에서
공연, 전시회에 참여했던 모든
예술가들께는
모든 창작가들을 존경하고
응원하는 마음을 담아
자동적으로 '아티스트 멤버십'의
혜택을 드립니다.$t$ where rank = 99 and (intro_text is null or intro_text = '') and intro_html is null;
update membership_tiers set mission_questions = $j$[{"id":"patron-taste","text":"요즘 가장 아끼는 책, 음악, 장소를 하나씩 들려주세요. (취향 설문)","type":"text"},{"id":"patron-vintage-origin","text":"빈티지가 좋아지게 된 계기는 무엇인가요?","type":"text"}]$j$::jsonb where rank = 3 and (mission_questions is null or mission_questions = '[]'::jsonb);
update membership_tiers set mission_questions = $j$[{"id":"lautrec-proof","text":"사일로 상점에서 구매한 물품의 인증 사진과, 그 물건에 얽힌 이야기를 들려주세요.","type":"photo"},{"id":"lautrec-taste","text":"당신의 취향을 한 문장으로 소개해 주세요. (취향 설문)","type":"text"}]$j$::jsonb where rank = 4 and (mission_questions is null or mission_questions = '[]'::jsonb);
update page_modules set is_hidden = true where module_type = 'membership_matrix' and page_id = (select id from page_builder where slug = 'membership');
update page_modules set sort_order = 4 where module_type = 'membership_plans' and page_id = (select id from page_builder where slug = 'membership');
insert into page_modules (page_id, module_type, sort_order, settings) select (select id from page_builder where slug = 'membership'), 'membership_depths', 2, $j${"heading":"","sceneHeightVh":130,"depths":[{"title":"Depth 1 · 문 앞 광장","text":"사일로를 운명적으로 찾아와 준 첫눈 같은 사람들. 따뜻한 광장에서 당신의 취향을 기록해 보세요."},{"title":"Depth 2 · 살롱의 서재","text":"호기심의 열쇠를 쥐고 토끼굴로 뛰어든 탐험가. 굳게 닫혀있던 시대의 지식과 영감의 서랍장이 열립니다."},{"title":"Depth 3 · 살롱의 무도회장","text":"낭만과 열정을 수집하는 파티의 주인공. 당신만의 아카이브를 완성하고 찬란한 모임을 즐겨보세요."},{"title":"Depth 4 · 비밀의 방","text":"예술과 문명을 지켜내는 수호자. 오래된 물건의 내밀한 사연과 가장 프라이빗한 살롱의 문이 열립니다."}]}$j$::jsonb where not exists (select 1 from page_modules where module_type = 'membership_depths' and page_id = (select id from page_builder where slug = 'membership'));
insert into page_modules (page_id, module_type, sort_order, settings) select (select id from page_builder where slug = 'membership'), 'membership_experience', 5, $j${"heading":"사일로에서의 경험, 한눈에","subtitle":"자리마다 열리는 세계를 은유로 담았어요. 흐리게 잠긴 곳은 다음 자리에서 열려요.","rows":[{"label":"광장의 대화","sub":"(커뮤니티 활동)","guest":"🔒 목록만 관람","angel":"자유로운 기록 ✍️","alice":"자유로운 기록 ✍️","gatsby":"자유로운 기록 ✍️","patron":"자유로운 기록 ✍️","lautrec":"살롱의 목소리 (칼럼) 🖋️"},{"label":"시간 여행 도슨트","sub":"(온라인 도슨트)","guest":"🔒 썸네일 노출","angel":"첫인사 열람","alice":"첫인사 열람","gatsby":"하루 1개의 문 🔑","patron":"하루 2개의 문 🔑","lautrec":"프라이빗 도슨트 🍷"},{"label":"영감의 서랍장","sub":"(큐레이션 칼럼)","guest":"🔒","angel":"🔒 굳게 닫힌 문","alice":"지식의 문 개방 📖","gatsby":"지식의 문 개방 📖","patron":"지식의 문 개방 📖","lautrec":"지식의 문 개방 📖"},{"label":"나만의 아카이브","sub":"(기록 및 수집)","guest":"🔒","angel":"2D 행성 발급 🪐","alice":"2D 행성 발급 🪐","gatsby":"컬렉션 수집 🎟️","patron":"컬렉션 수집 🎟️","lautrec":"우주 모션/오브제 제안 🌌"},{"label":"숨겨진 서사","sub":"(이전 주인의 사연)","guest":"🔒","angel":"🔒","alice":"🔒","gatsby":"🔒","patron":"은밀한 사연 열람 💌","lautrec":"은밀한 사연 열람 💌"},{"label":"살롱데상 초대","sub":"(오프라인 혜택)","guest":"-","angel":"-","alice":"모임 10% 할인","gatsby":"파티 우선 예매권 🥂","patron":"상시 자유 출입 👑","lautrec":"전시/공연 기획 및 주최 🎭"},{"label":"사일로의 명예","sub":"(플랫폼 특권)","guest":"-","angel":"-","alice":"-","gatsby":"-","patron":"3D 플래닛 에셋 💎","lautrec":"생태계 제안 및 추천권 🏅"}]}$j$::jsonb where not exists (select 1 from page_modules where module_type = 'membership_experience' and page_id = (select id from page_builder where slug = 'membership'));
update page_modules set settings = settings || '{"joinLabel":"초대장 열어보기"}'::jsonb where module_type = 'membership_carousel' and page_id = (select id from page_builder where slug = 'membership');
