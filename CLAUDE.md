# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## AI Working Rules

이 저장소에서 작업할 때 지켜야 하는 Git 브랜치 전략 및 동기화 규칙이다. 아래 규칙 4번(WIP Push)은 "Git operating rules" 절의 "커밋/푸시는 사용자 승인 후에만" 원칙에 대한 명시적 예외로, 사용자가 작업 중단/퇴근을 알리는 시점에는 승인을 별도로 구하지 않고 즉시 커밋·푸시한다.

1. **No Direct Commits to Main** — `main` 브랜치에서 직접 코드를 수정하거나 커밋하지 않는다.
2. **Feature Branch Workflow** — 새로운 EPIC이나 작업을 시작할 때는 반드시 `main`을 최신 상태로 pull 받은 후, `feature/EPIC-<번호>` 또는 `feature/<작업명>` 형식의 새 브랜치를 생성해 이동한 뒤 작업한다.
3. **Sync First** — 사용자가 작업 시작을 알리면, 다른 작업에 앞서 `git fetch`와 `git status`로 원격 저장소와 로컬의 상태를 먼저 확인하고 그 결과를 사용자에게 보고한다.
4. **WIP Push** — 사용자가 작업을 중단하거나 퇴근한다고 알리면, 현재 브랜치에 진행 중인 모든 변경 사항을 커밋하고 반드시 `origin`에 push하여 다른 기기에서 이어서 작업할 수 있도록 백업한다.

## Commands

```bash
npm run dev      # start dev server (Turbopack) at http://localhost:3000
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
```

No test runner is configured yet. There is no CI config in this repo.

## About this Next.js version

This project runs **Next.js 16.2.11**, a version newer than what most training data covers. `AGENTS.md` (imported by this file) warns that APIs/conventions may differ from what you'd normally assume — verify against `node_modules/next` behavior rather than assuming older App Router patterns, particularly around dynamic route params (both `page.tsx` and Route Handlers receive `params`, and Server Component `searchParams`, as a `Promise` that must be `await`ed).

## Architecture

This is a Next.js App Router app (TypeScript, Tailwind CSS v4) backed by Supabase (Postgres + Auth), for a membership-based community platform ("사일로 스토어"). There is no backend server of its own beyond Next.js Route Handlers — all data access goes through Supabase's PostgREST API using `@supabase/supabase-js`.

Site navigation is organized into four top-level tabs, defined once in `src/lib/navConfig.ts` (`NAV_TABS`) and rendered generically by `src/components/Navbar.tsx` based on each tab's `type` (`sidebar-left` / `sidebar-right` / `dropdown` / `link`) — see [`docs/navigation-blueprint.md`](docs/navigation-blueprint.md) for the full breakdown:
- **사일로상점** (`sidebar-left`) — curated item retail/rental (`/shop`), online docent content (`/docent?category=silostore`)
- **살롱데상** (`sidebar-right`) — club meetups (`/clubs`), community boards (`/boards`), online docent content (`/docent?category=salon`), salon check-in (`/salon/checkin`), plus several not-yet-built features wired to placeholder pages (all rendering the shared `<ComingSoon>` component)
- **공간 문의** (`dropdown`) — space rental (folded in from the former `rental` tab as of EPIC-018, URLs unchanged: `/rental?floor=1f_silostore`, `/rental?floor=2f_salon`) plus item-rental/styling inquiry placeholders
- **마이페이지** (`link`) — direct link to `/mypage`, added as its own top tab in EPIC-018 alongside the existing account-area mypage link (both coexist)

Account-related pages (`/me`, `/admin/payments`, `/settings`) are **not** part of this 4-tab structure — they live in the Navbar's separate account area (top-right) and have no active tab/submenu highlighted. `getActiveNavTabKey()` in `navConfig.ts` derives which tab (if any) is active from the current pathname + the `category` query param, so `/docent` and `/rental` are single shared pages whose content and nav highlighting both depend on the query string, not on separate routes per category. Membership (`membership_tiers`) gates benefits and content access throughout.

## Blueprint documents (Single Source of Truth)

This project maintains dedicated design/ops documents in `docs/` — treat each as the SSoT for its domain, not this file:

- [`docs/git-sync.md`](docs/git-sync.md) — Git workflow (start/end of work, commit/push, schema-change procedure, forbidden operations)
- [`docs/EPIC.md`](docs/EPIC.md) — full feature (Epic) list: 완료/진행중/예정
- [`docs/navigation-blueprint.md`](docs/navigation-blueprint.md) — full nav structure (top tabs, left/right sidebars, URLs, placeholder status, active-tab logic)
- [`docs/membership-blueprint.md`](docs/membership-blueprint.md) — `membership_rank`/`membership_tiers`, per-rank permissions/benefits, board access, pricing logic
- [`docs/content-blueprint.md`](docs/content-blueprint.md) — content model (boards/gallery/downloads/docent/shop/mypage) and cross-content connections
- [`docs/design-system.md`](docs/design-system.md) — de facto color/typography/sidebar/button/card/input conventions
- `docs/database-schema.sql` — DB schema (see "Verifying/changing the DB schema" below)

**Rules for working in this repo:**
1. **Before implementing a new feature, check the relevant Blueprint(s) first** — don't re-derive navigation placement, tier gating, content connections, or UI conventions from scratch when a Blueprint already documents them.
2. **Implement without conflicting with existing Blueprints.** If a request seems to contradict one (e.g. a different gating rule, a nav pattern that breaks `getActiveNavTabKey`), flag the conflict to the user before proceeding rather than silently diverging.
3. **If a Blueprint needs to change to match new work, update it in the same change** — don't let code and Blueprint drift apart the way `docs/database-schema.sql` drifted before its 2026-07-23 resync.
4. **When an Epic is completed, update `docs/EPIC.md`** (move it from 진행중/예정 to 완료), alongside the usual `CHANGELOG.md`/`NEXT_TASK.md` updates.

## Git operating rules

These apply to every session in this repo, in addition to the general Git Safety Protocol — see also [`docs/git-sync.md`](docs/git-sync.md) for the full workflow.

- **Start of work**: always sync in this order — `git status` first, then `git pull` (only if the working tree is clean; report to the user instead of pulling if there are local changes).
- **End of work**: only run `git add` / `git commit` / `git push` after the user has explicitly approved the change — never on your own initiative.
- **Git identity is already configured** (`user.name`/`user.email` set locally in this repo) — don't ask the user for it again or re-prompt for identity setup.
- **After every commit, report the commit hash and the push result** (e.g. `<old>..<new> main -> main`) back to the user.
- **Never run `--force` push, `reset`, or `rebase`** without an explicit, current instruction from the user to do so.
- **`origin/main` on GitHub is the single source of truth** for repo state — all work is synced against it, not against any other remote/branch/local copy.

## Error triage policy

When an error is found, classify it first — don't fix reflexively:

- **P0** — project won't run, build fails, DB connection fails
- **P1** — a feature is unusable, data fails to save
- **P2** — UI glitches, hydration warnings, console warnings, dev-mode-only warnings

P0/P1 block the current work and should be fixed (or at least flagged) immediately. **P2-and-below issues do not block feature development** — register them in `NEXT_TASK.md` and leave them unfixed until the user explicitly asks for a fix. Don't go fix a P2 you happen to notice while doing unrelated work; note it and move on.

## Project-specific rules

- **Schema questions**: don't ask the user about table/column names — check `docs/database-schema.sql` first (see Data model below for its caveats), then verify against the live DB if anything seems off (see "Verifying/changing the DB schema" below).
- **Membership rank is the authority for gating**: `members.membership_rank` (int) → `membership_tiers.rank`. Mapping: `0`=Silo Angel, `1`=Alice, `2`=Great Gatsby, `3`=Patron, `4`=Lautrec, `99`=Artist. `99` (Artist) is numerically above `4`, so `rank >= N` comparisons correctly include Artist wherever Lautrec is included — no special-casing needed.
- **Rank-gated content and pricing must be decided server-side, never client-side**: both "which fields can this user see" (curation text, docent body) and "what does this user pay" (club/shop/rental/docent pricing) are computed in a Route Handler using the caller's tier, never trusted from the request body. See "Server-side gating/pricing pattern" below — it's used everywhere money or restricted content is involved.
- **`members.is_admin`** gates `/admin/payments`. Only one real account currently has it (see git history / ask the user — don't assume). When testing admin behavior, temporarily flip `is_admin` on a disposable test account via the DB and flip it back immediately after — never leave more than the intended account admin.

### Verifying/changing the DB schema

This project does not use Supabase migration files — schema changes so far have all been applied ad hoc via the **Supabase Management API** (`POST https://api.supabase.com/v1/projects/<ref>/database/query` with a personal access token as `Authorization: Bearer`), run through `curl`. That token is **not stored anywhere in this repo or the user's Supabase project config** — it was pasted into chat by the user and only lives for that conversation. If you need to run DDL/RLS changes and don't have a working token in context, ask the user for one rather than assuming a prior session's token still works.

Practical tips learned from doing this repeatedly:
- Passing SQL inline as a `curl -d '...'` argument is fragile (shell quoting mangles apostrophes/Unicode). Write the JSON body to a scratch file and use `curl --data @file.json` instead.
- The anon-key REST API (`/rest/v1/<table>`) is useful for a quick *read* sanity check after a migration, but it's RLS-filtered — an empty `[]` result there doesn't distinguish "table is empty" from "RLS blocked it." Use the Management API (which runs as postgres, bypassing RLS) to check ground truth.
- `docs/database-schema.sql` is a point-in-time dump and reliably drifts from the live DB (e.g. `members.auth_user_id`, `members.is_admin`, `docent_contents.category`, and the `club_participation` points reason all exist live but predate/aren't in the file). Treat it as a starting point, not a source of truth — confirm column names live before depending on them.

### Supabase client setup

- `src/lib/supabaseClient.ts` exports a single browser-safe `supabase` client built from `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env.local`, gitignored). Imported directly into Server Components, Route Handlers, and Client Components alike — there is no separate server-only client, and no service-role key is used anywhere in the app (intentionally — see RLS section).
- Auth sessions are plain Supabase Auth (email/password, plus Google and Kakao OAuth — see `/login`), persisted client-side (browser localStorage) — **not** cookie-based SSR auth. Server Components cannot read "who is logged in"; only Client Components can (via the browser session), and Route Handlers only know the caller's identity if the client explicitly forwards `Authorization: Bearer <access_token>`.
- `src/lib/AuthProvider.tsx` is a client-side React Context (`useAuth()`) wrapping the whole app in `src/app/layout.tsx`. It exposes `session`, `member` (id, name, membership_rank, tier_name, is_admin), `loading` (session), and `memberLoading` (member row fetch — **check this too**, not just `loading`, before gating on `member` fields like `is_admin`; a page that redirects on `!member?.is_admin` without waiting for `memberLoading` will bounce real admins because `member` is still `null` on first render).
- `src/lib/serverAuth.ts` is the shared **server-side** auth/tier helper used by nearly every Route Handler:
  - `getRequestMember(request)` — reads the `Authorization` bearer token, verifies it (`supabase.auth.getUser`), and returns `{ userId, member, scopedClient, accessToken }` or `null`. `scopedClient` is a fresh `createClient` instance with the caller's token injected as the `Authorization` header — use it (not the module-level anon `supabase`) for any read/write that should be evaluated under RLS *as that user* (so `auth.uid()` resolves correctly).
  - `getTier(rank)` — fetches the full `membership_tiers` row (all gating/pricing flags) for a rank.
  - `canReadBoard` / `canWriteToBoard`, `RANK_LABELS` — board-specific helpers (see Boards below).
- `src/components/Navbar.tsx` renders the 4-tab nav (see Architecture) plus the account area, and uses `useSearchParams()` — it's wrapped in `<Suspense>` in `layout.tsx` because it's mounted in the root layout, which otherwise fails to build/hydrate reliably with a bare `useSearchParams()` call.

### Data model

`docs/database-schema.sql` documents the base schema (membership tiers, shop items, club sessions, salon/venue bookings, docent content, boards/points) — see the drift caveat above. Tables added or changed after that dump was written:

- `members.is_admin` (bool, default false) — see Admin dashboard below.
- `docent_contents.category` (`'silostore' | 'salon'`, NOT NULL with a CHECK constraint) — added after the base dump; drives the `/docent` tab split.
- `points_ledger.reason` CHECK constraint was extended with `'club_participation'` (club reservation point earnings — the original schema only enumerated `shop_purchase`/`shop_rental`/`venue_rental`/etc., not clubs).
- `public_profiles` — a **view** (`select id, name from members`) with `grant select` to `anon`/`authenticated`. `members` itself only allows a user to read their own row; anywhere the UI needs to show *someone else's* name (post/comment authors, admin payment lists, `/u/[memberId]`), it joins through this view instead of `members` directly, so no other member column ever leaks.

### Row Level Security (RLS)

Every table has RLS enabled. Patterns in use, by table role:

- **Public read** (`clubs`, `items`, `membership_tiers`, `boards`, `rental_types`, `docent_contents`, `public_profiles`): unrestricted `select`. A table with RLS on and *no* policy silently returns `[]` (no error) — this has been the single most common source of "why is my data missing" confusion in this project. Always check `pg_policies` (via the Management API) when a query unexpectedly comes back empty.
- **Own-row only** (`members`, `orders`, `reservations`, `rental_bookings`, `salon_checkins`, `docent_purchases`, `points_ledger` reads): `member_id`/`auth_user_id` must resolve to the caller's own row via `auth.uid()`. Writes from a Route Handler use the caller's `scopedClient` from `getRequestMember` so this resolves correctly.
- **Admin bypass**: `orders`, `reservations`, `rental_bookings`, `docent_purchases`, and `points_ledger` each have an *additional* select/update policy of the form `exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true)`. Postgres OR's multiple policies of the same command together, so this **adds** admin visibility without touching the own-row policy. See Admin dashboard below for how this is used.
- **Column-scoped write via GRANT, not just RLS**: `posts` needs *any* authenticated user to be able to bump `like_count`/`is_best` on *someone else's* post (liking it), but never edit their title/body. RLS alone is row-level and can't express "this column but not that one" — the actual mechanism is `revoke update on posts from authenticated; grant update (like_count, is_best) on posts to authenticated;` layered under a permissive `using (true)` UPDATE policy. Reach for this pattern (not a looser RLS policy) whenever cross-user writes need to be restricted to specific columns.
- **`points_ledger` insert policy is deliberately not just "own row"**: `post`/`comment`/`shop_purchase`/`shop_rental`/`venue_rental`/`club_participation` require `member_id` = caller's own row (self-attributed actions). But `like_received` and `best_post` credit a *different* member (the post's author, not the liker) — those clauses instead validate the action really happened (e.g. `like_received` requires a real row in `likes` from the caller for that post, `best_post` requires the post to actually be `is_best = true`) rather than checking ownership. The admin confirm flow (`/api/admin/payments/confirm`) also needs to insert points for arbitrary members, and does so via a blanket `exists (... is_admin = true)` clause.
  - **Gotcha hit and fixed**: a policy clause that subqueries the *same table it's a policy on* (an earlier `best_post` dedup check that did `not exists (select 1 from points_ledger where ...)`) causes Postgres to throw `infinite recursion detected in policy for relation "points_ledger"` (42P17). Don't self-reference a table inside its own RLS policy — do that dedup check in application code instead (see Points system below).
  - **Gotcha hit and fixed**: a Route Handler that queries `points_ledger` to check "has this already been credited" using the *admin's* `scopedClient` silently misses rows belonging to other members (RLS hides them), so the dedup check always says "not found" and double-credits. Any admin-side read of another user's data must go through a table that actually has an admin-bypass select policy — don't assume a `scopedClient` read is admin-scoped just because the caller is an admin elsewhere.

### Server-side gating/pricing pattern

Used for: item curation fields (`/api/items/[id]`), club reservation pricing (`/api/reservations`), shop order pricing (`/api/orders`), venue rental pricing (`/api/rental-bookings`), salon check-in fee (`/api/salon-checkins`), docent purchase pricing (`/api/docent-purchases`), and board write/read permissions (`/api/boards/**`).

The shared shape:
1. Client Component calls a Route Handler, forwarding `Authorization: Bearer <session.access_token>` if logged in (omit it entirely if not — the route treats that as anonymous/lowest tier, not an error, for read paths like item curation).
2. The route resolves the caller via `getRequestMember` + `getTier`, and computes the *real* answer (price, discount, unlocked fields, allowed/denied) itself — client-supplied values for things like price are never trusted, only IDs/quantities/dates.
3. Writes (orders, reservations, bookings, purchases, points) go through the caller's `scopedClient` so RLS enforces ownership as a second layer under the application logic, not just the route's own checks.
4. Responses either omit gated data entirely (curation fields become `{ locked: true, message }` instead of the real text) or include the server-computed price — never a client-editable field the server blindly trusts.

Don't replicate pricing/permission logic in the browser "for UX" beyond disabling a button optimistically — the Route Handler is the only source of truth, and the point of this pattern is that a user hitting the API directly with a forged request still can't get a better price or see gated content.

### Points system

`points_ledger` rows are created by the relevant Route Handler at the moment an action happens (post/comment/like/order/booking/purchase), *except* club reservation points, which historically were computed and stored on `reservations.point_earned` but never actually written to `points_ledger` until `/api/admin/payments/confirm` was built — that route back-fills them (`reason = 'club_participation'`) the first time a pending reservation is confirmed, and skips it if a row already exists for that `related_id`+`reason` (dedup done in application code, not RLS — see the recursion gotcha above). The same pending→confirm→credit shape applies to `orders`/`rental_bookings` too, even though those *also* credit points immediately at creation time (so the confirm-time step there is a no-op dedup check, not a first-time credit) — don't assume "already has a pending row" means "already has a points_ledger row"; always check before inserting.

`/mypage` shows the caller's total via `select('points').then(sum)` against `points_ledger` — relies on the own-row RLS select policy, no special endpoint needed.

### Admin dashboard

`/admin/payments` is the one place a human confirms bank-transfer payments (`payment_status: 'pending_transfer' → 'confirmed'`) across four otherwise-unrelated tables (`orders`, `reservations`, `rental_bookings`, `docent_purchases`). `src/app/api/admin/payments/route.ts` (list) and `.../confirm/route.ts` (mutate) both key off a `type` string to know which table/columns/point-reason to use — when adding a fifth payable feature, extend the `TABLE_SELECT`/`REASON_BY_TYPE` maps in `confirm/route.ts` and the per-type row-building loop in the list route, rather than writing a parallel admin flow. Note `docent_purchases` uses `purchased_at` instead of `created_at` and has no `point_earned` column — the list route normalizes the timestamp field name when building the unified response, and the confirm route's generic point-crediting step is a safe no-op for it (undefined `point_earned` fails the `> 0` check).

### Page patterns

- Public read-only listings (`/clubs`, `/shop`, `/rental`) are async Server Components querying Supabase directly. List pages whose content depends on a query string (`/rental?floor=`) read `searchParams` as an awaited `Promise` prop rather than becoming client components.
- `/docent` needs `useSearchParams()` (to read `?category=`) in a page that's otherwise just doing a client-side fetch, so it wraps its content in a local `<Suspense>` boundary within the page file itself (same reason as Navbar, see above).
- Pages needing the current user's session (`/mypage`, `/me`, `/shop/[id]`, `/boards/**`, `/docent/[id]`, `/signup`, `/login`) are Client Components using `useAuth()` / `useParams()`.
- Auth-gated pages redirect client-side: check `loading`/`memberLoading`/`session` (and `member` fields like `is_admin` where relevant) from `useAuth()` in a `useEffect`, then `router.replace("/login")` or `router.replace("/")`. There is no middleware-based route protection — every gate is per-page.
