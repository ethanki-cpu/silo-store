import Link from "next/link";

export type HomeCurationSliderItem = {
  id: string;
  title: string;
  imageUrl?: string;
  href: string;
};

// EPIC-041: 홈 큐레이션 블록(관리자 admin/navigation/settings에서 설정) 하나를
// 렌더링하는 순수 표시용 컴포넌트 — 섹션 제목 + 가로 스크롤 썸네일 목록.
// 실제 데이터 조회/더미 데이터 대체는 호출부(src/app/page.tsx)의 책임이다.
export function HomeCurationSlider({
  title,
  items,
}: {
  title: string;
  items: HomeCurationSliderItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="py-6">
      <h2 className="text-xl font-bold px-8 mb-3">{title}</h2>
      <div className="flex gap-4 overflow-x-auto px-8 pb-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="shrink-0 w-40 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full aspect-square object-cover"
              />
            ) : (
              <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                이미지 없음
              </div>
            )}
            <div className="p-2">
              <p className="text-sm font-medium truncate">{item.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
