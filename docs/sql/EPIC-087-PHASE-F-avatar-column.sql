-- EPIC-087-PHASE-F: 멤버십 팝오버의 프로필 사진 — member_profiles.cover_image는
-- 코드베이스 전체에서 참조가 0건(완전히 미사용)이라 되살리지 않고 members에
-- 새 컬럼을 추가한다. 이미 Management API로 즉시 실행 완료(라이브 반영됨,
-- 2026-08-07).

alter table members add column if not exists avatar_url text;

-- 업로드 대상 Storage 버킷 신설(post-images/gallery/attachments와 동일한
-- public-read + authenticated-upload + owner-delete 패턴, 기존 버킷들의
-- 정책을 건드리지 않기 위해 avatars 전용 정책을 별도로 추가).
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_authenticated_upload" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "avatars_owner_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and owner = auth.uid());
