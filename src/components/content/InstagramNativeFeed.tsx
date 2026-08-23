import { fetchInstagramFeed } from "@/lib/instagramFeed";
import { InstagramFeedPost } from "@/components/content/InstagramFeedPost";

// EPIC-143: 홈/랜딩 등 어디에도 끼워 넣을 수 있는 서버 컴포넌트 — R2에
// 캐싱된 instagram_feeds를 직접 읽으므로(공개 read RLS) Instagram API를
// 전혀 호출하지 않고 즉시 렌더링된다. 데이터가 아직 없으면(첫 동기화 전)
// 조용히 실패하는 대신 안내 문구를 보여준다(instruction #4: 견고한
// fallback).
export async function InstagramNativeFeedSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}

export async function InstagramNativeFeed({ limit = 12 }: { limit?: number }) {
  const items = await fetchInstagramFeed(limit);

  if (items.length === 0) {
    return (
      <div className="flex aspect-[3/1] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
        아직 동기화된 인스타그램 게시물이 없어요.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) =>
        item.permalink ? (
          <a key={item.id} href={item.permalink} target="_blank" rel="noopener noreferrer" aria-label={item.caption ?? "Instagram 게시물"}>
            <InstagramFeedPost item={item} />
          </a>
        ) : (
          <InstagramFeedPost key={item.id} item={item} />
        ),
      )}
    </div>
  );
}
