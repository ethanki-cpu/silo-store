"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "../EmptyState";

type Visitor = { id: string; name: string; visited_at: string };

export function VisitorsPanel({ memberId }: { memberId: string }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: visitRows } = await supabase
        .from("member_visitors")
        .select("id, visitor_id, visited_at")
        .eq("owner_id", memberId)
        .order("visited_at", { ascending: false })
        .limit(50);

      const rows = (visitRows ?? []) as {
        id: string;
        visitor_id: string;
        visited_at: string;
      }[];

      const visitorIds = rows.map((r) => r.visitor_id);
      const { data: profiles } =
        visitorIds.length > 0
          ? await supabase
              .from("public_profiles")
              .select("id, name")
              .in("id", visitorIds)
          : { data: [] as { id: string; name: string }[] };

      if (cancelled) return;

      const nameById = new Map(
        ((profiles ?? []) as { id: string; name: string }[]).map((p) => [
          p.id,
          p.name,
        ]),
      );

      setVisitors(
        rows.map((r) => ({
          id: r.id,
          name: nameById.get(r.visitor_id) ?? "알 수 없는 회원",
          visited_at: r.visited_at,
        })),
      );
      setLoadingData(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (loadingData) return <p className="text-gray-500">불러오는 중...</p>;
  if (visitors.length === 0) {
    return <EmptyState message="아직 방문자가 없어요." />;
  }

  return (
    <div className="space-y-2">
      {visitors.map((v) => (
        <div
          key={v.id}
          className="flex justify-between rounded-lg border border-gray-200 p-3"
        >
          <span>{v.name}</span>
          <span className="text-xs text-gray-400">
            {new Date(v.visited_at).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
