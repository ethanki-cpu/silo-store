"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { OWNER_RANK, PREVIEW_COOKIE, TIER_NAMES, isPreviewRank } from "@/lib/ownerPreview";

type Member = {
  id: string;
  name: string;
  membership_rank: number;
  tier_name: string;
  is_admin: boolean;
};

type AuthContextValue = {
  session: Session | null;
  /** 화면·클라이언트 게이팅이 쓰는 회원 — Owner가 등급 체험 중이면 그 등급 회원처럼 덮어쓴 값 */
  member: Member | null;
  loading: boolean;
  memberLoading: boolean;
  // EPIC-168: Owner / 등급 체험
  isOwner: boolean;
  /** 체험 중인 등급(없으면 null = Owner 본인으로 보는 중) */
  previewRank: number | null;
  /** 등급 체험 시작(rank) / 끝내기(null) — 서버도 같은 쿠키를 읽어 판정하므로 저장 후 페이지를 새로 불러온다. */
  setPreviewRank: (rank: number | null) => void;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  member: null,
  loading: true,
  memberLoading: true,
  isOwner: false,
  previewRank: null,
  setPreviewRank: () => {},
});

function readPreviewCookie(): number | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + PREVIEW_COOKIE + "=([^;]*)"));
  const n = m ? Number(decodeURIComponent(m[1])) : NaN;
  return Number.isInteger(n) && isPreviewRank(n) ? n : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [realMember, setMember] = useState<Member | null>(null);
  const [previewCookie, setPreviewCookie] = useState<number | null>(null);
  useEffect(() => setPreviewCookie(readPreviewCookie()), []);
  const [loading, setLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(true);

  useEffect(() => {
    // HOTFIX(실사용 재현 — "인스타그램 임베드가 로딩에서 멈춘다"): getSession()이
    // reject되거나(에러 핸들러 없었음) 멈춰버리면(supabase-js 내부 세션 락 등)
    // loading이 영원히 true로 남아, loading을 기다리는 화면(예:
    // InstagramMediaSlider)이 영원히 로딩 상태에 갇힌다 — 실사용자 브라우저에서
    // 실제로 재현 확인됨(사일로 샌드박스 한정 문제가 아니었음). 5초 안에
    // 응답이 없으면 일단 loading=false로 넘어가 화면이 멈추지 않게 하고,
    // getSession()이 늦게라도 응답하면 그 결과로 session은 갱신된다.
    let settled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        settled = true;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        settled = true;
        setLoading(false);
      });

    const timeout = setTimeout(() => {
      if (!settled) setLoading(false);
    }, 5000);

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => {
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // EPIC-079: session의 초기 state는 항상 null이고, 실제 로그인 여부는
    // getSession()이 비동기로 resolve된 뒤에야 알 수 있다 — 이 effect가
    // `loading`(세션 확인 자체가 끝났는지)을 기다리지 않고 session===null만
    // 보고 즉시 memberLoading=false를 내보내면, 로그인된 사용자도 첫
    // 렌더링에서 아주 짧게 "로그인 안 됨"(member=null, memberLoading=false)
    // 상태가 실제로 관측된다 — 이 순간에 값을 읽는 화면(예: 글 수정 페이지의
    // 작성자 확인)이 잘못된 판정을 내려버리는 버그를 실제로 재현/확인했다.
    if (loading) return;

    if (!session) {
      setMember(null);
      setMemberLoading(false);
      return;
    }

    setMemberLoading(true);

    supabase
      .from("members")
      .select("id, name, membership_rank, is_admin, membership_tiers(name)")
      .eq("auth_user_id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setMember(null);
          setMemberLoading(false);
          return;
        }
        const tier = data.membership_tiers as unknown as { name: string } | null;
        setMember({
          id: data.id,
          name: data.name,
          membership_rank: data.membership_rank,
          tier_name: tier?.name ?? "-",
          is_admin: data.is_admin,
        });
        setMemberLoading(false);
      });
  }, [session, loading]);

  // EPIC-168: Owner는 관리자 권한을 항상 갖고, 등급 체험 쿠키가 있으면 그 등급 회원(관리자 아님)처럼 보인다. 진짜 등급이 Owner가 아니면 쿠키는 무시한다.
  const isOwner = (realMember?.membership_rank ?? 0) >= OWNER_RANK;
  const previewRank = isOwner ? previewCookie : null;
  const member = useMemo<Member | null>(() => {
    if (!realMember) return null;
    if (!isOwner) return realMember;
    if (previewRank != null) return { ...realMember, membership_rank: previewRank, tier_name: TIER_NAMES[previewRank] ?? realMember.tier_name, is_admin: false };
    return { ...realMember, is_admin: true };
  }, [realMember, isOwner, previewRank]);
  const setPreviewRank = (rank: number | null) => {
    if (typeof document === "undefined") return;
    if (rank == null) document.cookie = `${PREVIEW_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    else document.cookie = `${PREVIEW_COOKIE}=${rank}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    setPreviewCookie(rank);
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ session, member, loading, memberLoading, isOwner, previewRank, setPreviewRank }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
