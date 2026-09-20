// HOTFIX-156.28: Supabase Storage(public-assets/attachments 등)의 기존 파일을
// R2로 옮기고, DB 전체의 옛 Supabase Storage URL을 R2 URL로 치환한다.
//
// 사용: node scripts/migrate-supabase-storage-to-r2.mjs [--dry-run] [--skip-copy] [--skip-rewrite]
//  - 파일 복사 단계: 버킷 공개 URL로 내려받아 R2에 migrated/<bucket>/<name>로 업로드
//    (프로젝트가 egress 제한 상태면 402가 나온다 — 요금제 복구 후 실행).
//  - URL 치환 단계: 모든 text/varchar/jsonb/text[] 컬럼에서
//    https://<ref>.supabase.co/storage/v1/object/public/  →  <R2_PUBLIC_URL>/migrated/
//    (복사 단계가 전부 성공한 뒤에만 실행된다.)
// .env.local의 SUPABASE_MANAGEMENT_API_TOKEN / NEXT_PUBLIC_SUPABASE_URL / R2_* 사용.
import fs from "node:fs";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
  }),
);
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const REF = new URL(SUPA_URL).hostname.split(".")[0];
const TOKEN = env.SUPABASE_MANAGEMENT_API_TOKEN;
const R2_BASE = env.R2_PUBLIC_URL.replace(/\/$/, "");
const OLD_PREFIX = `${SUPA_URL}/storage/v1/object/public/`;
const NEW_PREFIX = `${R2_BASE}/migrated/`;

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`SQL 실패: ${JSON.stringify(body)}`);
  return body;
}

async function copyFiles() {
  const objs = await sql("select o.bucket_id, o.name, o.metadata->>'mimetype' mt, b.public from storage.objects o join storage.buckets b on b.id=o.bucket_id order by o.created_at");
  console.log(`객체 ${objs.length}개`);
  let ok = 0, skipped = 0;
  const failed = [];
  for (const o of objs) {
    const key = `migrated/${o.bucket_id}/${o.name}`;
    try {
      try { await r2.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key })); skipped++; continue; } catch { /* 없음 → 업로드 */ }
      const url = `${OLD_PREFIX}${o.bucket_id}/${o.name.split("/").map(encodeURIComponent).join("/")}`;
      if (DRY) { console.log("[dry]", url, "->", key); continue; }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`다운로드 ${res.status} ${(await res.text()).slice(0, 120)}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await r2.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: buf, ContentType: o.mt || res.headers.get("content-type") || "application/octet-stream" }));
      ok++;
      console.log("복사", key, buf.length);
    } catch (e) {
      failed.push({ key, error: String(e.message ?? e) });
      console.error("실패", key, e.message ?? e);
    }
  }
  console.log(`복사 완료: 신규 ${ok}, 이미 있음 ${skipped}, 실패 ${failed.length}`);
  return failed.length === 0;
}

async function rewriteUrls() {
  const cols = await sql(`select c.table_schema, c.table_name, c.column_name, c.data_type from information_schema.columns c
    join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name and t.table_type='BASE TABLE'
    where c.table_schema='public' and c.data_type in ('text','character varying','jsonb','ARRAY')
    and (c.data_type<>'ARRAY' or c.udt_name in ('_text','_varchar'))`);
  const like = `%${OLD_PREFIX}%`.replace(/'/g, "''");
  const oldP = OLD_PREFIX.replace(/'/g, "''");
  const newP = NEW_PREFIX.replace(/'/g, "''");
  for (const c of cols) {
    const t = `"${c.table_schema}"."${c.table_name}"`, col = `"${c.column_name}"`;
    let cond, set;
    if (c.data_type === "jsonb") { cond = `${col}::text like '${like}'`; set = `${col} = replace(${col}::text, '${oldP}', '${newP}')::jsonb`; }
    else if (c.data_type === "ARRAY") { cond = `array_to_string(${col}, E'\u0001') like '${like}'`; set = `${col} = (select array_agg(replace(x, '${oldP}', '${newP}')) from unnest(${col}) x)`; }
    else { cond = `${col} like '${like}'`; set = `${col} = replace(${col}, '${oldP}', '${newP}')`; }
    const [{ n }] = await sql(`select count(*)::int n from ${t} where ${cond}`);
    if (!n) continue;
    console.log(`${DRY ? "[dry] " : ""}${c.table_name}.${c.column_name}: ${n}행`);
    if (!DRY) await sql(`update ${t} set ${set} where ${cond}`);
  }
}

if (!args.has("--skip-copy")) {
  const allOk = await copyFiles();
  if (!allOk && !DRY) { console.error("일부 복사 실패 — URL 치환을 건너뜁니다."); process.exit(1); }
}
if (!args.has("--skip-rewrite")) await rewriteUrls();
console.log("끝");
