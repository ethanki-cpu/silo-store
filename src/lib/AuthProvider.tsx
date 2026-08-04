"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type Member = {
  id: string;
  name: string;
  membership_rank: number;
  tier_name: string;
  is_admin: boolean;
};

type AuthContextValue = {
  session: Session | null;
  member: Member | null;
  loading: boolean;
  memberLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  member: null,
  loading: true,
  memberLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => listener.subscription.unsubscribe();
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

  return (
    <AuthContext.Provider value={{ session, member, loading, memberLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
