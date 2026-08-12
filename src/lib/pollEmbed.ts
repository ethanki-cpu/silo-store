"use client";

// EPIC-096(요구사항 3.2): 인라인 설문(PollEmbedBlock, blockEditorCore.ts)의
// 정적 placeholder(`<div data-type="poll-embed" data-poll-id="...">`)를
// 실제 투표 가능한 위젯으로 바꿔치기한다 — dangerouslySetInnerHTML로 넣은
// 정적 마크업은 그 자체로는 아무 동작도 하지 않으므로(galleryCarousel.ts/
// instagramEmbed.ts와 동일한 이유). GET/POST 모두 기존 "설문 [우리들 맴]"
// 기능이 쓰던 polls/poll_options/poll_votes 인프라(/api/polls/[id],
// /api/polls/[id]/votes)를 그대로 재사용 — 새 API 계약 없음.
type PollOption = { id: string; label: string; vote_count: number };
type PollData = {
  id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  my_vote_option_id: string | null;
};

function optionBarHtml(opt: PollOption, total: number, myVoteId: string | null): string {
  const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0;
  const isMine = opt.id === myVoteId;
  return `
    <button type="button" data-option-id="${opt.id}" class="poll-embed-option ${isMine ? "poll-embed-option-mine" : ""}" style="position:relative;display:block;width:100%;text-align:left;border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;margin-top:6px;background:#fff;overflow:hidden;cursor:pointer;">
      <span style="position:absolute;inset:0;background:${isMine ? "#dcfce7" : "#f3f4f6"};width:${pct}%;z-index:0;"></span>
      <span style="position:relative;z-index:1;display:flex;justify-content:space-between;font-size:13px;color:#374151;">
        <span>${isMine ? "✓ " : ""}${opt.label}</span>
        <span style="color:#9ca3af;">${pct}% (${opt.vote_count})</span>
      </span>
    </button>`;
}

function render(container: HTMLElement, poll: PollData, accessToken: string | null) {
  const alreadyVoted = poll.my_vote_option_id !== null;
  container.innerHTML = `
    <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">📊 설문 · 참여 ${poll.total_votes}명</p>
    <p style="font-weight:600;font-size:14px;color:#111827;margin:0 0 6px;">${poll.question}</p>
    <div data-poll-options>${poll.options.map((o) => optionBarHtml(o, poll.total_votes, poll.my_vote_option_id)).join("")}</div>
    ${!accessToken ? '<p style="font-size:11px;color:#ef4444;margin-top:6px;">투표하려면 로그인이 필요해요.</p>' : ""}
  `;

  if (!accessToken || alreadyVoted) return;

  container.querySelectorAll<HTMLButtonElement>("[data-option-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const optionId = btn.dataset.optionId;
      if (!optionId) return;
      container.querySelectorAll<HTMLButtonElement>("[data-option-id]").forEach((b) => (b.disabled = true));
      try {
        const res = await fetch(`/api/polls/${poll.id}/votes`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ optionId }),
        });
        if (res.ok) {
          const fresh = await fetch(`/api/polls/${poll.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then((r) => r.json());
          render(container, fresh, accessToken);
        } else {
          container.querySelectorAll<HTMLButtonElement>("[data-option-id]").forEach((b) => (b.disabled = false));
        }
      } catch {
        container.querySelectorAll<HTMLButtonElement>("[data-option-id]").forEach((b) => (b.disabled = false));
      }
    });
  });
}

// accessToken은 서버 컴포넌트가 모르는 브라우저 세션(localStorage) 정보라
// 호출부(UniversalBlockRenderer)가 useAuth()로 읽어 넘겨준다 — 비로그인
// 이어도 결과는 보여주고 투표 버튼만 비활성화한다(ScrapButton 등 이
// 프로젝트의 다른 로그인 유도 패턴과 동일한 원칙).
export function processPollEmbeds(accessToken: string | null, root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(".poll-embed").forEach((el) => {
    if (el.dataset.pollInit === "true") return;
    el.dataset.pollInit = "true";
    const pollId = el.getAttribute("data-poll-id");
    if (!pollId) return;

    el.innerHTML = '<p style="font-size:12px;color:#9ca3af;">설문 불러오는 중...</p>';
    fetch(`/api/polls/${pollId}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((poll: PollData | null) => {
        if (!poll) {
          el.innerHTML = '<p style="font-size:12px;color:#9ca3af;">설문을 불러오지 못했어요.</p>';
          return;
        }
        render(el, poll, accessToken);
      })
      .catch(() => {
        el.innerHTML = '<p style="font-size:12px;color:#9ca3af;">설문을 불러오지 못했어요.</p>';
      });
  });
}
