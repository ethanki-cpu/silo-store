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
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, member, loading, memberLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
