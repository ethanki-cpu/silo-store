# STAGES

> 이 문서는 프로젝트의 **진행 단계(Stage)**를 정의하는 공식 문서(SSoT)다.
>
> **Stage와 EPIC은 서로 다른 축이며 절대 혼용하지 않는다.**
> - **EPIC**은 작업 단위(하나의 변경 이력)다 — 상세 목록은 [docs/EPIC.md](EPIC.md) 참고.
> - **Stage**는 프로젝트 전체가 지금 어느 국면에 있는지를 나타내는 상위 분류다.
>
> 여러 EPIC이 모여 하나의 Stage를 이루지만, **EPIC 번호는 Stage와 무관하게 계속 증가한다**
> (Stage가 바뀌어도 EPIC 번호는 리셋되지 않는다 — EPIC-054 다음은 Stage 구분 없이 EPIC-055).
> "Stage 1"이라는 표현과 "EPIC-001"이라는 표현은 우연히 숫자가 겹칠 뿐 서로 무관한 축이다.
>
> 이 문서에서 EPIC 번호를 언급하는 것은 "이 EPIC이 어느 Stage의 어느 항목에 기여했는지"를
> 기록하기 위함이지, EPIC 번호와 Stage를 매핑하는 규칙이 있다는 뜻이 아니다.
>
> 최종 확인: 2026-07-28 (EPIC-054E 작성, EPIC-054D까지의 실제 코드 상태 기준).

## Stage 1 — Foundation

**설명**: 웹사이트의 기반 시스템 구축.

**포함 내용**: Navigation / Routing / Authentication / Supabase / Storage / Database / Board System / Page System / Block Editor / SEO / Metadata / Sitemap / Responsive / Accessibility

### 현재 진행률

아래 14개 항목 기준 **10/14 완료, 1/14 부분 브랜치 존재(미병합), 3/14 미착수** — 상세는 각 항목 참고.

| 항목 | 상태 | 기여 EPIC | 비고 |
|---|---|---|---|
| Navigation | 🔶 부분 완료 | EPIC-017/018/019/023/035/037/039/040/041-042/043/044/054A/054D | 동작은 하나 **P0 이슈**: `navConfig.ts`의 `FALLBACK_NAV_TABS`와 라이브 `site_navigations`(DB)가 서로 다른 구조로 공존(EPIC-054D 발견, 미해결) |
| Routing | ✅ 완료 | EPIC-044, EPIC-047~051, EPIC-054F | App Router 동적 라우팅(heritage/community/boards/[id] 등) + Board Definition System 기반 무한 확장 가능. EPIC-054F가 Community/Heritage/Studio/Membership/Gallery/Archive 6개 카테고리 허브의 마지막 404 구멍을 메워 76개 page.tsx 전부 실제 Route 확보(마이페이지 12개 탭·Online Docent는 이전부터 완비) |
| Authentication | ✅ 완료 | EPIC-001, EPIC-020, EPIC-021 | Supabase Auth 이메일/비밀번호 + Google/Kakao OAuth |
| Supabase | ✅ 완료 | 전 EPIC 공통 기반 | anon key 단일 클라이언트, RLS 기반 권한 제어(`src/lib/serverAuth.ts`) |
| Storage | 🔶 부분 완료 | EPIC-033 | 관리자 CMS 이미지 업로드(로고/슬라이드)는 동작. 게시글 이미지 전용 Storage Bucket(post-images/gallery/attachments) + Garbage Collection은 **별도 미병합 브랜치 `feature/EPIC-053`에만 존재**(아래 "미병합 브랜치" 참고) |
| Database | ✅ 완료 | 전 EPIC 공통 기반 | `docs/database-schema.sql`(SSoT), 단 라이브 DB와 주기적 드리프트 발생(문서 자체에 경고 있음) |
| Board System | ✅ 완료 | EPIC-047~051, EPIC-054C, EPIC-055 | Board Definition System(`BOARD_DEFINITIONS`/`INDIVIDUAL_BOARD_DEFINITIONS` + `resolveBoardDefinition()` + `BoardRenderer`) — config 파일 하나만 수정해 새 게시판 추가 가능(재확인됨). EPIC-055가 마지막 미연결 구간(이름별 동적 라우트 3개 그룹, EPIC-044의 `UniversalBoard` stub)까지 실제 게시판에 연결하고 그 stub 컴포넌트를 삭제해 "Universal Board System 하나만 쓴다"는 원칙을 완성 |
| Page System | ✅ 완료 | EPIC-054B/054C | Page Module 시스템(`pageModules.ts` + `PageModuleRenderer`) — Page ≠ Board 1:1, 여러 Board를 한 Page에 배치 가능(`/boards` 디렉토리로 실증) |
| Block Editor | ⬜ 미착수(이 브랜치 기준) | — | 이 Stage 문서가 반영하는 코드 계보(EPIC-054A~D)에는 EPIC-052의 기본 `RichTextEditor`(Tiptap HTML)만 있다. 완전한 Block 기반 에디터(FigureImage/Gallery/Embed/LinkCard, JSON 정본화)는 **별도 미병합 브랜치 `feature/EPIC-053`에 존재** — 아래 참고 |
| SEO | 🔶 부분 완료 | EPIC-054D | root metadata(title/description/OG/Twitter) 적용, 페이지별 metadata는 미적용(70개 페이지 전부 root 값 상속) |
| Metadata | 🔶 부분 완료 | EPIC-054D | 위 SEO와 동일 사안 — `metadataBase`만 있고 페이지별 `generateMetadata`/canonical 없음 |
| Sitemap | ✅ 완료 | EPIC-054D | `src/app/sitemap.ts` — 파일시스템 자동 스캔 + 동적 콘텐츠 조회, 새 페이지 추가 시 코드 수정 불필요 |
| Responsive | ⬜ 미착수 | — | `Navbar.tsx`에 반응형 브레이크포인트 자체가 없음(EPIC-054D 감사에서 확인, P1) |
| Accessibility | 🔶 부분 완료 | EPIC-054D | 사이드바(Escape/포커스 복귀/`inert`)·드롭다운(`group-focus-within`/`aria-haspopup`) 개선. 드롭다운 Escape 닫기, 전체 사이트 스크린리더 검증 등은 미완료 |

### 남은 EPIC (Stage 1 완료까지)

1. **`feature/EPIC-053`(Block Editor) 브랜치 처리 결정** — 이미 완성된 별도 브랜치를 그대로 병합할지, 재작업할지 사용자 결정 필요(가장 우선순위 높음 — Block Editor 자체는 이미 구현되어 있고 "병합" 여부만 남음).
2. **Navigation 이중 구조 통합**(P0, EPIC-054D 발견) — `FALLBACK_NAV_TABS` vs 라이브 `site_navigations` 중 하나로 일원화.
3. **페이지별 SEO metadata** — 70개 페이지 각각에 의미 있는 title/description/canonical 부여.
4. **Responsive 레이아웃** — Navbar/Sidebar의 모바일 대응 UX 설계.
5. **Accessibility 전체 감사 마무리** — 드롭다운 Escape 지원, 스크린리더 실사용 검증.

### ⚠️ 미병합 브랜치 참고

이 Stage의 "현재 진행률"은 **이 문서가 작성된 브랜치(`feature/EPIC-054A`→`054B`→`054C`→`054D`→`054E` 계보)의 실제 코드 상태**를 기준으로 한다. 저장소에는 이와 별개로 `feature/EPIC-053`(Block Editor 시스템 확장, `docs/EPIC.md`에는 아직 기록되지 않음 — main에서 분기된 별도 계보) 브랜치가 존재하며, 이 브랜치를 병합하면 위 "Block Editor"/"Storage" 항목의 상태가 바뀐다. Stage 진행률은 병합 시점마다 다시 확인할 것.

---

## Stage 2 — Content Platform

**설명**: 콘텐츠 작성 시스템.

**예상 포함 기능**: Notification / Draft / Revision / Collections / Series / Reading History / AI Assistant / Related Posts / Template

**상태**: 착수 전. `Draft`의 초기 형태(서버 임시 저장 API `/api/boards/[id]/drafts`)가 EPIC-053 브랜치에 존재하나 어떤 화면에서도 호출되지 않는 죽은 코드로 남아있음(NEXT_TASK.md 기록) — 실질적 착수는 아님.

---

## Stage 3 — Community

**설명**: 커뮤니티 시스템.

**예상 기능**: Follow / Badge / Level / Activity Feed / Mention / Realtime Notification / Friend / Recommendation

**상태**: 착수 전. `Follow`(`member_follows`)와 `Badge`(`member_badges`)는 EPIC-022/052에서 **테이블/기본 UI**까지는 만들어졌으나(마이페이지 팔로우/받은 배지 탭), Activity Feed/Level/Mention/Realtime/Friend/Recommendation 개념은 전혀 없음 — Stage 3의 정식 착수로 보지 않는다(마이페이지 개인 기능의 일부일 뿐, 커뮤니티 전반의 소셜 그래프/피드 시스템은 아직 없음).

---

## Stage 4 — Business

**설명**: 비즈니스 시스템.

**예상 기능**: 예약 / 결제 / Membership / Studio / Rental / Styling / Orders / Admin CMS / Analytics

**상태**: ⚠️ **이 Stage 모델이 도입되기 전(EPIC-001~018 무렵)에 이미 상당 부분 구현되어 있었다.** 예약(클럽/공간 대관), 결제 확인(`/admin/payments`), Membership(등급/가격), Studio(공간 대관), Rental, Styling(EPIC-016 포트폴리오), Orders는 전부 동작 중. Admin CMS는 결제 확인/게시글 관리/내비게이션 관리 범위에서 존재. **Analytics만 없음.** 이는 Stage를 역행하는 것이 아니라 — 이 프로젝트가 Stage 개념 도입(EPIC-054E) 이전부터 실사용을 목표로 비즈니스 기능을 먼저 만들었기 때문이다. Foundation(Stage 1)이 뒤늦게 정비되고 있는 것으로 이해할 것(예: Board System/Page System은 Stage 4 기능들보다 한참 늦게 EPIC-047~054에서 만들어짐).

---

## Stage 5 — Experience

**설명**: 사용자 경험.

**포함 기능**: Animation / SEO Advanced / Performance / Accessibility / PWA / Offline / Search Optimization

**상태**: 착수 전. Stage 1의 기초 SEO/Accessibility/Performance(EPIC-054D)가 이 Stage의 "Advanced"판을 위한 토대이지 이 Stage 자체의 착수는 아니다 — 기초(Stage 1)와 고급화(Stage 5)를 구분한다.

---

## Stage 6 — Scale

**설명**: 운영 및 확장.

**포함 기능**: Monitoring / Caching / Redis / Queue / Backup / CDN / Image Optimization / Logging

**상태**: 착수 전.

---

## Stage 판정 규칙

- 새 EPIC을 시작할 때, 그 EPIC이 어느 Stage에 기여하는지 이 문서에서 먼저 확인한다.
- 한 EPIC이 여러 Stage에 걸쳐 있을 수 있다(예: EPIC-054D는 Stage 1의 SEO/Sitemap/Accessibility 항목 여러 개에 동시에 기여) — 억지로 하나의 Stage에만 배정하지 않는다.
- Stage의 "포함 내용"에 없는 새로운 종류의 작업이 필요해지면, 새 Stage를 추가하기 전에 기존 6개 Stage 중 어디에 자연스럽게 속하는지 먼저 검토한다.
- EPIC 완료 시 이 문서의 해당 Stage "현재 진행률"/"남은 EPIC" 섹션을 갱신한다(§ "문서 규칙", `PROJECT_BLUEPRINT.md` §8 참고).
