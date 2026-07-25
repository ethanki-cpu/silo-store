This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 개발 환경 설정 (.env.local)

이 프로젝트는 Supabase(Postgres + Auth)를 백엔드로 사용합니다. 아래 순서대로 따라 하면 **5분 안에** 로컬 개발 환경을 구성할 수 있습니다.

### 1. `.env.local` 파일 생성

프로젝트 루트(`package.json`과 같은 위치)에 `.env.local` 파일을 만들고 아래 두 줄만 채우면 됩니다:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

이 파일은 `.gitignore`에 포함되어 있어 커밋되지 않습니다 — 각자 로컬에 직접 만들어야 합니다.

### 2. Supabase Dashboard에서 값 확인

1. [supabase.com/dashboard](https://supabase.com/dashboard)에서 이 프로젝트를 연다.
2. 좌측 사이드바 **Project Settings**(톱니바퀴) → **Data API** 메뉴로 이동한다.
3. **Project URL** 값을 그대로 `NEXT_PUBLIC_SUPABASE_URL`에 붙여넣는다.
4. **Project API keys** 섹션에서 **`anon` `public`** 키를 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 붙여넣는다.

### 3. 반드시 지켜야 할 규칙

- ⚠️ **`NEXT_PUBLIC_SUPABASE_URL`은 반드시 Project URL만 사용한다.** `https://<project-ref>.supabase.co` 형태 그대로여야 하며, **절대로 뒤에 `/rest/v1/`을 붙이지 않는다.** (`@supabase/supabase-js`가 내부적으로 `/auth/v1`, `/rest/v1` 등의 경로를 자체적으로 이어 붙이므로, URL에 경로가 이미 포함되어 있으면 `.../rest/v1/auth/v1/...`처럼 잘못 합성되어 로그인·데이터 조회가 전부 실패한다 — 실제로 발생했던 장애 원인이므로 반드시 주의.)
- ✅ **`NEXT_PUBLIC_SUPABASE_ANON_KEY`는 `anon` `public` 키만 사용한다.**
- ❌ **`service_role` 키는 어떤 환경에서도 절대 사용하지 않는다.** 이 프로젝트는 클라이언트/서버 어디에서도 anon key만으로 동작하도록 설계되어 있으며(RLS로 권한 제어), service_role 키를 쓰는 코드는 이 저장소에 존재하지 않는다.
- ⚠️ **`.env.local`은 git으로 공유되지 않는다(`.gitignore` 대상).** 회사 PC/개인 노트북 등 새 머신에서 이 프로젝트를 열 때마다 **각 PC에서 직접** `.env.local`을 새로 만들어야 하며, 한 PC에서 값을 고쳐도 다른 PC에는 자동으로 반영되지 않는다.
- ⚠️ **`.env.local`을 수정한 뒤에는 반드시 개발 서버(`npm run dev`)를 완전히 재시작한다.** `NEXT_PUBLIC_*` 환경변수는 빌드/컴파일 시점에 클라이언트 번들에 값이 그대로 박혀 들어가므로, 서버를 재시작하지 않으면 파일을 고쳐도 브라우저는 여전히 예전 값으로 동작한다(브라우저 새로고침만으로는 해결되지 않음).

> 위 두 항목은 실제로 발생했던 장애(EPIC-021)에서 확인된 내용이다: 한 PC의 `.env.local`만 고치고 다른 PC/서버 프로세스는 그대로 둔 채 테스트하면서 "분명 고쳤는데 왜 아직도 안 되지" 하는 혼란이 있었다 — 값을 고친 **그 PC에서, 서버를 재시작한 뒤** 테스트하고 있는지 항상 먼저 확인할 것.

### 4. 설치 및 실행

```bash
npm install
npm run dev
```

[http://localhost:3000/shop](http://localhost:3000/shop)에 접속했을 때 물품 목록이 정상적으로 로드되면 환경 설정이 올바른 것입니다. "데이터를 불러오지 못했어요" 오류가 뜬다면 2~3단계(특히 URL에 `/rest/v1/`이 붙어있지 않은지)와, `.env.local` 수정 후 서버를 재시작했는지를 다시 확인하세요.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
