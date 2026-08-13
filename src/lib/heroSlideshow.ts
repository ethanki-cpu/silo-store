// EPIC-092(요구사항 6/7): 홈페이지 메인 슬라이드쇼(site_settings.hero_slideshow)
// 설정 타입 + 정규화 헬퍼 — 관리자 화면(src/app/admin/navigation/settings)과
// 공개 홈페이지(src/app/page.tsx) 둘 다 이 파일 하나를 공유해 타입이
// 어긋나지 않게 한다.
//
// PC/모바일 독립 설정(요구사항 7): 기존에는 hero_slideshow가 곧
// HeroSlideshowConfig 하나였다(단일 슬라이드쇼). 이제 { pc, mobile } 두
// 세트로 나뉜다 — 라이브 DB에는 아직 옛 flat 모양(HeroSlideshowConfig 그대로)
// 데이터가 남아있을 수 있으므로, normalizeHeroSlideshow가 읽는 시점에
// 새 모양으로 변환한다(별도 SQL 백필 없이 애플리케이션 코드에서만 처리 —
// JSONB 값의 모양 변경일 뿐 컬럼/테이블 변경이 아니므로 DDL이 필요 없다).

export type SlideItem = { imageUrl: string; title: string; description: string };

export type HeroSlideshowConfig = {
  slides: SlideItem[];
  autoAdvanceSeconds: number;
  objectFit: "cover" | "contain";
  /** @deprecated EPIC-039: wallpaperUrls(배열)로 대체. 구버전 데이터 호환용으로만 읽는다. */
  wallpaperUrl: string;
  wallpaperUrls: string[];
  // EPIC-078 후속: 여백 배경 이미지 업로드 시 적용할 압축 품질(원본 대비 %,
  // 1~100). 100이면 압축 없이 원본 그대로 업로드한다. 이미 업로드된
  // 이미지에는 소급 적용되지 않는다 — 다음에 파일을 새로 업로드할 때부터
  // 적용.
  wallpaperQuality: number;
  // EPIC-092(요구사항 6): 슬라이드쇼 위젯의 바깥 여백(px). 기본 0(기존과
  // 동일한 화면 끝까지 꽉 찬 배치).
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  // EPIC-110: 슬라이드쇼 섹션 자체의 높이(vh) — null이면 기존 기본값
  // (모바일 60vh/데스크톱 70vh 반응형)을 그대로 쓴다. 값을 지정하면 두
  // 브레이크포인트 모두에 동일하게 적용된다(HeroSlideshow.tsx 참고).
  heightVh: number | null;
};

export type HeroSlideshowValue = {
  pc: HeroSlideshowConfig;
  mobile: HeroSlideshowConfig;
};

// 매번 새 객체를 만든다 — pc/mobile 기본값이 배열(slides/wallpaperUrls)을
// 같은 참조로 공유하면 한쪽을 수정할 때 다른 쪽도 같이 바뀌는 버그가 생긴다.
export function defaultHeroSlideshowConfig(): HeroSlideshowConfig {
  return {
    slides: [],
    autoAdvanceSeconds: 5,
    objectFit: "cover",
    wallpaperUrl: "",
    wallpaperUrls: [],
    wallpaperQuality: 100,
    marginTopPx: 0,
    marginBottomPx: 0,
    marginLeftPx: 0,
    marginRightPx: 0,
    heightVh: null,
  };
}

export function defaultHeroSlideshowValue(): HeroSlideshowValue {
  return { pc: defaultHeroSlideshowConfig(), mobile: defaultHeroSlideshowConfig() };
}

function normalizeConfig(raw: Partial<HeroSlideshowConfig> | null | undefined): HeroSlideshowConfig {
  const value = { ...defaultHeroSlideshowConfig(), ...(raw ?? {}) };
  // EPIC-039: 구버전 단일 wallpaperUrl을 wallpaperUrls 배열로 1회 이전.
  if (value.wallpaperUrls.length === 0 && value.wallpaperUrl) {
    value.wallpaperUrls = [value.wallpaperUrl];
  }
  return value;
}

// EPIC-092(요구사항 7): raw가 이미 { pc, mobile } 새 모양이면 그대로 쓰고,
// 옛 flat 모양(HeroSlideshowConfig 그대로)이거나 비어있으면 그 값을 pc/mobile
// 양쪽에 동일하게 채워 넣는다 — 관리자가 한쪽 탭을 편집해 저장하기 전까지는
// 기존 라이브 데이터가 PC/모바일 양쪽에서 지금과 똑같이 보인다.
export function normalizeHeroSlideshow(raw: unknown): HeroSlideshowValue {
  if (!raw || typeof raw !== "object") return defaultHeroSlideshowValue();
  const obj = raw as Record<string, unknown>;
  if (obj.pc || obj.mobile) {
    return {
      pc: normalizeConfig(obj.pc as Partial<HeroSlideshowConfig> | undefined),
      mobile: normalizeConfig(obj.mobile as Partial<HeroSlideshowConfig> | undefined),
    };
  }
  const flat = normalizeConfig(raw as Partial<HeroSlideshowConfig>);
  return { pc: flat, mobile: { ...flat } };
}
