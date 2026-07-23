# CHANGELOG

## 2026-07-23
- 작업 규칙 정비: `NEXT_TASK.md`, `CHANGELOG.md` 신설, `package.json`에 `type-check` 스크립트 추가.
- swing2app 구버전 앱 기능/데이터 이식 (9개 항목):
  - `item_personas` 캐릭터 은행(68명) + `items.persona_id`, `/shop/[id]` 이전 주인 사연 캐릭터 표시
  - `items.category` 8개 시대(Time Slip) CHECK 제약 + `/shop` 필터 탭
  - `docent_contents.figure_name` + `/docent` 인물별 그룹 보기
  - `boards.board_type`에 `adoption_story`/`archive`/`qna` 추가, `posts.order_id` 컬럼
  - `downloads` 테이블 + `/downloads` 페이지 (관리자 전용 업로드)
  - `daily_checkins` + `/attendance` 출석체크 (2P 적립)
  - `polls`/`poll_options`/`poll_votes` + 집계 뷰 + `/polls`
  - `/mypage`에 "Your Treasures" 구매 물품 섹션
- `silo-store`를 독립 git 저장소로 분리 (`git init` + Initial commit, 기존 `.gitignore` 그대로 사용).
- `PROJECT_BLUEPRINT.md` 신규 생성 (프로젝트 개요/아키텍처 문서, 코드 기준 작성 + TODO 섹션 분리).
- `docs/database-schema.sql`을 실제 운영 DB(Supabase Management API)와 전면 동기화하고, 이 프로젝트의 **유일한 공식 DB 스키마 문서(Single Source of Truth)**로 명시. 프로젝트 밖 `silostore_schema.sql` 사본은 더 이상 관리하지 않음.
