# PROJECT BLUEPRINT

> **2026-07-30, EPIC-073 "Documentation Architecture Refactoring"**: 이 문서는 더 이상 프로젝트의
> 개요/아키텍처 상세를 담지 않는 **인덱스 전용(index only)** 문서입니다. 프로젝트가 커지면서
> 이 문서 하나에 모든 정보가 들어있는 구조가 더 이상 적절하지 않아, 기존에 이 문서(§1~§11)에
> 있던 모든 내용을 아래 "Documentation Index"의 문서들로 옮겼습니다 — **정보를 삭제하거나
> 요약하지 않고, 전부 옮겼습니다.** 실제 상세가 필요하면 아래 인덱스를 따라가십시오.

## Project Name

사일로 스토어 (Silo Store) — Silo Platform.

## Current Stage

**Stage 1 — Foundation.** 실시간 값과 진행률은 [docs/PROJECT_DASHBOARD.md](docs/PROJECT_DASHBOARD.md)
(Roadmap 표) 및 [docs/STAGES.md](docs/STAGES.md)에서 항상 최신 상태로 관리된다 — 이 문서는 그
값을 복제하지 않는다.

## Current Epic

실시간 값은 [docs/PROJECT_DASHBOARD.md](docs/PROJECT_DASHBOARD.md)의 "Current EPIC"/"Next EPIC"
섹션에서 항상 최신 상태로 관리된다 — 이 문서는 그 값을 복제하지 않는다(마지막 확인 시점 기준
Current EPIC은 EPIC-074B, Next EPIC은 EPIC-075였다 — 이 문서를 다시 열어볼 때는 반드시
PROJECT_DASHBOARD.md에서 최신 값을 확인할 것).

## Documentation Index

### 이번 재구성(2026-07-30, EPIC-073)으로 새로 생긴 최상위 문서

| 문서 | 다루는 범위 |
|---|---|
| [PROJECT_VISION.md](PROJECT_VISION.md) | 이 플랫폼을 왜 만드는가 — Instagram/네이버 블로그의 한계, 아카이브/커뮤니티/컬렉션/큐레이션 철학, 핵심 가치, 향후 비전(구 `docs/VISION.md`를 이 경로로 이동 + 병합) |
| [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) | 기술 스택, 전체 아키텍처, 프로젝트 구조, 주요 기능 인벤토리, API 구조, 인증 구조, 공통 컴포넌트, SEO/Sitemap/robots.txt |
| [PROJECT_RULES.md](PROJECT_RULES.md) | 영구 개발 규칙, 개발 워크플로우, 검증 순서(Typecheck/Lint/Build/Git Status), Stage/EPIC 관리 원칙과 문서 갱신 규칙 |
| [BOARD_SYSTEM.md](BOARD_SYSTEM.md) | Board Types, Rendering, Board lifecycle, Board permissions, Board relationships |
| [PAGE_BUILDER.md](PAGE_BUILDER.md) | Page → Modules → Widgets → Rendering → Preview → Publish (컴파일 타임 Page Module 시스템, EPIC-054B/C) |
| [WIDGET_SYSTEM.md](WIDGET_SYSTEM.md) | 위젯(모듈) 16종 목록, 위젯별 Rendering/Configuration/Preview/Dependencies/Supported page types, Future widgets |
| [MEMBERSHIP_SYSTEM.md](MEMBERSHIP_SYSTEM.md) | Membership Rank, Permission, Benefits/Visibility/Restrictions, Future plans |
| [POINT_SYSTEM.md](POINT_SYSTEM.md) | Points, Badges, Ranking, Activity, Reward |
| [NAVIGATION_SYSTEM.md](NAVIGATION_SYSTEM.md) | Top Tabs, Left/Right Sidebar, Hub Pages, Board Pages, Navigation hierarchy |

### 작업 추적 문서 (루트, 기존 위치 그대로)

| 문서 | 다루는 범위 |
|---|---|
| [CHANGELOG.md](CHANGELOG.md) | 변경 이력(날짜/EPIC별) |
| [NEXT_TASK.md](NEXT_TASK.md) | 다음 할 일 / 진행 중 항목 |

### 기존 공식 설계 문서 (`docs/`, Single Source of Truth) — 이번 재구성으로 이동하지 않음

프로젝트 운영/설계 문서는 `docs/`에 분야별로 나뉘어 있으며, 각 문서가 해당 분야의 **공식
SSoT**입니다. 새로운 기능을 구현하기 전에는 관련 Blueprint를 먼저 확인하고, 구현이 문서와
어긋나면 문서를 함께 갱신합니다(`CLAUDE.md`의 "Blueprint 우선 확인" 규칙 참고).

| 문서 | 다루는 범위 |
|---|---|
| [docs/PROJECT_DASHBOARD.md](docs/PROJECT_DASHBOARD.md) | 매 세션 가장 먼저 읽는 현황 요약(Vision/Roadmap/Current·Next EPIC/Progress/Recent Completed/Current Priority/Known Issues/Technical Debt/Next Milestone) |
| [docs/STAGES.md](docs/STAGES.md) | 프로젝트 전체 진행 단계(Stage 1 Foundation ~ Stage 8 Scale Platform) 정의와 각 Stage의 상세 진행률 |
| [docs/EPIC.md](docs/EPIC.md) | 전체 기능(Epic) 목록 — 완료/진행중/예정 |
| [docs/git-sync.md](docs/git-sync.md) | Git 작업 절차(시작/종료/커밋/푸시/스키마 변경/금지 사항) |
| [docs/navigation-blueprint.md](docs/navigation-blueprint.md) | 전체 Navigation 구조(Top nav, 좌/우 Sidebar, URL, placeholder 여부, 활성 탭 판정 로직) — [NAVIGATION_SYSTEM.md](NAVIGATION_SYSTEM.md)가 요약만 참조 |
| [docs/membership-blueprint.md](docs/membership-blueprint.md) | `membership_rank`/`membership_tiers`, 등급별 권한·혜택, 게시판 접근, 가격 계산 로직 — [MEMBERSHIP_SYSTEM.md](MEMBERSHIP_SYSTEM.md)가 요약만 참조 |
| [docs/content-blueprint.md](docs/content-blueprint.md) | 게시판/갤러리/자료실/도슨트/상점/마이페이지 콘텐츠 모델과 콘텐츠 간 연결 구조 — [BOARD_SYSTEM.md](BOARD_SYSTEM.md)가 요약만 참조 |
| [docs/design-system.md](docs/design-system.md) | 실제 사용 중인 색상/타이포그래피/사이드바/버튼/카드/인풋 등 de facto 디자인 관례 |
| `docs/database-schema.sql` | DB 스키마 (Single Source of Truth) |

**Rules for working in this repo:** (구 `PROJECT_BLUEPRINT.md`, 지금은 [PROJECT_RULES.md](PROJECT_RULES.md)에 전문 보존)
1. 새 기능을 구현하기 전에 관련 Blueprint를 먼저 확인한다.
2. 기존 Blueprint와 충돌하지 않게 구현한다 — 충돌 시 구현 전에 사용자에게 확인한다.
3. Blueprint가 새 작업과 맞지 않으면 같은 변경 안에서 함께 갱신한다.

---

## 문서 재구성 메모 (2026-07-30, EPIC-073)

이 재구성 작업(코드/DB 변경 없음, 문서만 재배치)의 상세 — 무엇을 어디로 옮겼는지, 어떤 정보가
겹치는지 — 는 이 EPIC의 최종 보고에 기록되어 있다(대화 기록 참고, 별도 문서화하지 않음 — 이번
지시가 "보고만 하고 커밋하지 말라"였기 때문).
