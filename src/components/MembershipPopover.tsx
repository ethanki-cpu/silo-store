"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// EPIC-087-PHASE-F: GNB "멤버십 등급"/"회원 이름" 클릭 시 뜨는 작은 팝오버.
// 이 코드베이스의 유일한 기존 드롭다운(스튜디오 상단 탭)은 EPIC-041-042-
// HOTFIX 코멘트에 따르면 hover 타이밍 버그 때문에 일부러 JS state 없이
// 순수 CSS group-hover로 재구현된 것이라 그대로 재사용할 수 없다(이건
// 클릭 트리거라 hover 전제 자체가 다르다) — 여기서는 표준적인 click-
// outside + Escape로 새로 구현한다.
const REASON_LABELS: Record<string, string> = {
  post: "글 작성",
  comment: "댓글 작성",
  like_received: "좋아요 받음",
  best_post: "개념글 승격",
  shop_purchase: "상점 구매",
  shop_rental: "상점 대여",
  venue_rental: "공간 대관",
  club_participation: "클럽 참여",
  attendance: "출석체크",
};

type ActivityEntry = { id: string; createdAt: string; label: string; detail?: string };

export function MembershipPopover({
  memberId,
  memberName,
  tierName,
  onClose,
}: {
  memberId: string;
  memberName: string;
  tierName: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 팔로우/팔로워 수는 FollowPanel.tsx처럼 전체 행을 select하지 않고
      // count-only 쿼리로 가볍게(팝오버는 뱃지 숫자만 필요, 목록은
      // /mypage/follow에서). 최근 활동은 TimelinePanel.tsx와 동일한
      // 3-쿼리 조합에 .limit(5)만 추가한 축소판.
      const [memberRes, followingRes, followerRes, ledgerRes, likesRes, followsRes] = await Promise.all([
        supabase.from("members").select("avatar_url").eq("id", memberId).single(),
        supabase.from("member_follows").select("id", { count: "exact", head: true }).eq("follower_id", memberId),
        supabase.from("member_follows").select("id", { count: "exact", head: true }).eq("following_id", memberId),
        supabase
          .from("points_ledger")
          .select("id, reason, points, created_at")
          .eq("member_id", memberId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("likes")
          .select("id, created_at, posts(title)")
          .eq("member_id", memberId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("member_follows")
          .select("id, created_at, public_profiles:following_id(name)")
          .eq("follower_id", memberId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;

      setAvatarUrl((memberRes.data as { avatar_url: string | null } | null)?.avatar_url ?? null);
      setFollowingCount(followingRes.count ?? 0);
      setFollowerCount(followerRes.count ?? 0);

      const ledgerEntries = (
        (ledgerRes.data ?? []) as { id: string; reason: string; points: number; created_at: string }[]
      ).map<ActivityEntry>((row) => ({
        id: `ledger-${row.id}`,
        createdAt: row.created_at,
        label: REASON_LABELS[row.reason] ?? row.reason,
        detail: `+${row.points}P`,
      }));
      const likeEntries = (
        (likesRes.data ?? []) as unknown as {
          id: string;
          created_at: string;
          posts: { title: string | null } | null;
        }[]
      ).map<ActivityEntry>((row) => ({
        id: `like-${row.id}`,
        createdAt: row.created_at,
        label: "좋아요",
        detail: row.posts?.title ?? undefined,
      }));
      const followEntries = (
        (followsRes.data ?? []) as unknown as {
          id: string;
          created_at: string;
          public_profiles: { name: string } | null;
        }[]
      ).map<ActivityEntry>((row) => ({
        id: `follow-${row.id}`,
        createdAt: row.created_at,
        label: "팔로우",
        detail: row.public_profiles?.name ?? undefined,
      }));

      const merged = [...ledgerEntries, ...likeEntries, ...followEntries]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      setActivity(merged);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg z-50 p-4 text-sm"
    >
      <div className="flex items-center gap-3 mb-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200" />
        )}
        <div>
          <p className="font-medium">{memberName}</p>
          <p className="text-xs text-gray-400">{tierName}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-3 text-xs">
        <Link href="/mypage/follow" onClick={onClose} className="hover:underline">
          팔로우 {followingCount ?? "-"}
        </Link>
        <Link href="/mypage/follow" onClick={onClose} className="hover:underline">
          팔로워 {followerCount ?? "-"}
        </Link>
      </div>

      <div className="border-t border-gray-100 pt-3 mb-3">
        <p className="text-xs text-gray-400 mb-1">나의 최근 활동</p>
        {loading ? (
          <p className="text-xs text-gray-300">불러오는 중...</p>
        ) : activity.length === 0 ? (
          <p className="text-xs text-gray-300">아직 활동이 없어요.</p>
        ) : (
          <ul className="space-y-1">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-xs">
                <span>
                  {a.label}
                  {a.detail && ` · ${a.detail}`}
                </span>
                <span className="text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/mypage/timeline" onClick={onClose} className="text-xs text-blue-600 hover:underline mt-1 inline-block">
          전체 보기
        </Link>
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-2 text-xs">
        {/* EPIC-087-PHASE-F: 메시지/DM 시스템이 이 코드베이스에 전혀 없어
            (전체 검색으로 확인) 실제 기능 없이 준비 중 표시만 — 사용자
            확인 완료, 별도 EPIC으로 후속. */}
        <p className="text-gray-400">받은 메시지 (준비 중)</p>
        <Link href="/boards/mind-diary" onClick={onClose} className="block hover:underline">
          오늘 마음일기
        </Link>
      </div>
    </div>
  );
}
