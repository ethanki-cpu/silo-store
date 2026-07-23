"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthProvider";

type Option = { id: string; label: string; vote_count: number };
type Poll = {
  id: string;
  question: string;
  is_active: boolean;
  created_at: string;
  options: Option[];
  total_votes: number;
  my_vote_option_id: string | null;
};

function PollCard({ poll, onVoted }: { poll: Poll; onVoted: () => void }) {
  const { session } = useAuth();
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasVoted = poll.my_vote_option_id !== null;

  async function vote(optionId: string) {
    if (!session) {
      setError("로그인이 필요해요.");
      return;
    }
    setVoting(true);
    setError(null);

    const res = await fetch(`/api/polls/${poll.id}/votes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ optionId }),
    });

    const data = await res.json();
    setVoting(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    onVoted();
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold">{poll.question}</h2>
        {!poll.is_active && (
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
            종료됨
          </span>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const pct =
            poll.total_votes > 0
              ? Math.round((opt.vote_count / poll.total_votes) * 100)
              : 0;
          const isMine = poll.my_vote_option_id === opt.id;

          if (hasVoted || !poll.is_active) {
            return (
              <div key={opt.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={isMine ? "font-semibold" : ""}>
                    {opt.label} {isMine && "✓"}
                  </span>
                  <span className="text-gray-500">
                    {pct}% ({opt.vote_count})
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-gray-800"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          }

          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={voting}
              className="w-full text-left rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <p className="text-xs text-gray-400 mt-3">
        총 {poll.total_votes}표 참여
      </p>
    </div>
  );
}

export default function PollsPage() {
  const { session, member } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [fetching, setFetching] = useState(true);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setFetching(true);
    const res = await fetch("/api/polls", {
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
      cache: "no-store",
    });
    const data = await res.json();
    setPolls(Array.isArray(data) ? data : []);
    setFetching(false);
  }

  useEffect(() => {
    load();
  }, [session]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    const res = await fetch("/api/polls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ question, options }),
    });

    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setCreateError(data.error);
      return;
    }

    setQuestion("");
    setOptions(["", ""]);
    load();
  }

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">설문조사</h1>

      {member?.is_admin && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-gray-200 p-4 mb-8 space-y-3"
        >
          <h2 className="font-semibold text-sm text-gray-600">
            새 설문 만들기 (관리자)
          </h2>
          <input
            type="text"
            required
            placeholder="질문"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          {options.map((opt, idx) => (
            <input
              key={idx}
              type="text"
              placeholder={`선택지 ${idx + 1}`}
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[idx] = e.target.value;
                setOptions(next);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          ))}
          <button
            type="button"
            onClick={() => setOptions([...options, ""])}
            className="text-sm text-gray-600 underline"
          >
            선택지 추가
          </button>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {creating ? "만드는 중..." : "설문 만들기"}
          </button>
        </form>
      )}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : polls.length === 0 ? (
        <p className="text-gray-500">진행 중인 설문이 없어요.</p>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} onVoted={load} />
          ))}
        </div>
      )}
    </main>
  );
}
