# Media Architecture (EPIC-082)

> Stage 2 "Data and Media Separation" 전략의 구현 문서 — 이진 파일(미디어)을
> Supabase Storage에서 분리해 Cloudflare R2로 옮기고, Supabase DB에는
> 메타데이터만 남기는 구조를 정의한다. 상세 전략 배경은
> [`PROJECT_ARCHITECTURE.md`](../PROJECT_ARCHITECTURE.md) §Stage 2 기술 전략
> "Data Decoupling & R2 Storage" 참고.
>
> **이번 EPIC(082) 범위**: `media_library` DB 스키마, R2 pre-signed 업로드
> API, 공용 TypeScript 타입 — **UI/에디터 컴포넌트는 건드리지 않는다.**
> 실제로 에디터/갤러리/히어로 위젯이 이 파이프라인을 쓰도록 배선하는 것은
> 다음 EPIC(083)의 범위다. 이 문서는 그 배선 작업이 따라야 할 데이터
> 계약(data contract)을 미리 정의해둔다.

## 1. 왜 분리하는가

지금까지(EPIC-053~) 게시글 이미지/영상은 `src/lib/storage.ts`를 통해
Supabase Storage 버킷(`post-images`/`gallery`/`attachments`)에 직접
업로드되고, Tiptap 노드(`FigureImage`/`GalleryBlock`, `blockEditorCore.ts`)는
그 결과 URL을 노드 속성(`src`)에 문자열 그대로 저장한다. 이 방식의 한계:

- **재사용 불가**: 같은 이미지를 여러 게시글에서 쓰려면 파일을 다시
  업로드해야 한다(URL만 저장하고 파일 자체를 중앙에서 관리하지 않음).
- **메타데이터 부재**: 원본 치수(width/height), 영상 길이, alt 텍스트가
  노드마다 따로 관리되거나 아예 없다.
- **Storage 비용/대역폭**: Supabase Storage는 Postgres와 같은 프로젝트
  안에 있어 미디어 트래픽이 늘수록 DB 인프라와 비용이 얽힌다. R2는
  Cloudflare CDN과 직결되고 egress 비용 구조가 다르다.

`media_library` 테이블은 "이 파일이 어디 있고 무엇인지"를 한 번만
기록하고, 실제 게시글/위젯 노드는 그 UUID(`media_id`)만 참조하게 만드는
것이 목표다.

## 2. 컴포넌트

```
[Browser] --1. POST /api/media/presigned--> [Route Handler] --2. PutObjectCommand + getSignedUrl--> [R2 SDK]
[Browser] --3. PUT uploadUrl(직접, 서버 경유 안 함)--------------------------------------------> [Cloudflare R2]
[Browser] --4. INSERT media_library(publicUrl, ...)---------------------------------------------> [Supabase]
```

1. 브라우저가 파일을 고르면 `fileName`/`fileType`/`fileSize`를
   `POST /api/media/presigned`(`src/app/api/media/presigned/route.ts`)에
   보낸다. 로그인 필요(`Authorization: Bearer <access_token>`).
2. 서버는 R2 SDK(`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`,
   S3 호환 API)로 5분짜리 pre-signed PUT URL을 만들어 돌려준다 — 파일
   바이트 자체는 이 서버를 절대 거치지 않는다.
3. 브라우저가 그 `uploadUrl`로 파일을 직접 R2에 PUT 업로드한다.
4. 업로드가 성공하면 브라우저(또는 후속 서버 호출)가 `media_library`에
   메타데이터 행을 insert한다 — **이 4번 단계는 아직 어디에도 구현되어
   있지 않다**(이번 EPIC은 1~2번까지, 즉 pre-signed URL 발급까지만
   만든다). 3번(R2 업로드 성공 여부)을 서버가 알 방법이 없는 구조적
   한계상, 4번은 클라이언트가 업로드 성공을 확인한 뒤 별도로 호출해야
   하는 API(`POST /api/media` 같은 것, 미구현)가 필요하다 — EPIC-083에서
   설계.

## 3. `media_library` 스키마

`docs/sql/EPIC-082-media-library.sql` 참고. 요약:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, FK `auth.users`, `on delete set null` | 업로더. 탈퇴해도 미디어 행은 남는다(고아 상태, `user_id=null`) |
| `file_url` | text not null | R2 Public CDN URL(`${R2_PUBLIC_URL}/${fileKey}`) |
| `file_name` | text not null | 원본 파일명(표시용 — R2 객체 키에는 안 쓰임, 아래 참고) |
| `mime_type` | text not null | `image/png`, `video/mp4` 등 |
| `size_bytes` | bigint not null | |
| `width` / `height` | integer, nullable | 이미지/영상 치수. presigned 발급 시점엔 알 수 없어(서버가 파일을 안 봄) 업로드 후 클라이언트가 채운다 |
| `duration` | integer, nullable | 영상 길이(초). 이미지는 항상 null |
| `alt_text` | text, nullable | 접근성/SEO |
| `created_at` | timestamptz | |

RLS: 조회는 전체 공개, insert/update/delete는 본인(`auth.uid() = user_id`)
또는 관리자(`members.is_admin`)만.

## 4. R2 객체 키 규칙

`media/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}` —
`src/lib/storage.ts`의 기존 Supabase Storage 명명 규칙(`${Date.now()}-${crypto.randomUUID()}.${ext}`)
과 동일한 사고방식(원본 파일명을 키에 그대로 쓰지 않아 경로 조작/충돌을
원천 차단, 확장자만 보존)에 사용자별 prefix(`media/${userId}/`)를 더한
것 — 사용자별 파일을 R2 콘솔에서 구분하기 쉽게 하기 위함(GC/정리 작업에
유용, `image_cleanup_queue`와 유사한 필요가 R2에도 생길 수 있음).

## 5. TypeScript 데이터 계약 (`src/lib/media.ts`)

- **`MediaAsset`**: `media_library` 행의 camelCase 서버/클라이언트 공용
  형태. `mediaAssetFromRow()`가 Supabase가 돌려주는 snake_case
  `MediaLibraryRow`를 변환한다.
- **`PresignedUploadRequest`/`PresignedUploadResponse`**:
  `/api/media/presigned`의 요청/응답 바디 타입.
- **`UniversalMediaBlockAttrs`**(목표 스펙, 아직 미사용): 다음 EPIC에서
  Tiptap 노드가 `media_id`(media_library.id)를 참조하도록 확장할 때 쓸
  속성 모양 — `{ mediaId, fallbackUrl?, caption, featured }`. 기존
  `FigureImageAttrs`/`GalleryImageAttrs`(`blockEditorCore.ts`)는 여전히
  `src`(URL 문자열)를 직접 저장하는 구조 그대로다 — **이번 EPIC은 이
  타입을 정의만 하고 어떤 실제 노드에도 연결하지 않았다.**

## 6. EPIC-083(다음 단계)을 위한 마이그레이션 메모

실제로 에디터가 `media_library`를 쓰게 만들려면 최소한 다음이 필요하다
(설계만, 이번 EPIC에서 구현하지 않음):

1. **업로드 완료 확인 API** — R2 PUT 성공 후 클라이언트가 메타데이터
   (치수/영상 길이는 클라이언트가 `<img>`/`<video>` 엘리먼트로 직접 읽거나,
   서버가 R2 `HeadObject`로 `Content-Length`만 재확인하는 정도)와 함께
   `media_library`에 행을 insert하는 라우트.
2. **기존 노드와의 하위 호환** — `FigureImageAttrs.src`(문자열 URL)를
   `mediaId`로 완전히 대체할지, 아니면 `mediaId`를 선택적으로 추가해
   있으면 `media_library`를 조회하고 없으면 기존 `src`를 그대로 쓰는
   점진적 전환으로 갈지 결정 필요 — 기존 게시글 수천 건이 이미 `src`
   문자열로 저장돼 있어 일괄 마이그레이션 없이는 점진적 전환이 안전하다.
3. **GC(가비지 컬렉션)** — 현재 Supabase Storage용
   `image_cleanup_queue`(`src/lib/imageGc.ts`)와 동등한 메커니즘이
   `media_library`/R2에도 필요(게시글에서 더 이상 참조하지 않는 미디어
   정리).
