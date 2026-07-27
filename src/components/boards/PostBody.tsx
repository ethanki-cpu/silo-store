import { sanitizeHtml } from "@/lib/sanitize";

// EPIC-052: Tiptap Block Editor 도입 이전 글(plain text)과 이후 글(HTML)이
// 같은 posts.body 컬럼에 섞여 있어, 태그 포함 여부로 렌더링 방식을
// 나눈다 — HTML이면 정제 후 렌더링(서버에서 이미 한 번 정제했지만,
// 이중 방어), 아니면 기존처럼 줄바꿈만 살려 보여준다.
export function PostBody({ body }: { body: string }) {
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(body);

  if (looksLikeHtml) {
    return (
      <div
        className="prose prose-sm max-w-none mt-8 text-gray-800"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
      />
    );
  }

  return (
    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap mt-8 text-[15px]">
      {body}
    </p>
  );
}
