// EPIC-119: /about-silo 3D 우주("사일로의 우주")를 관리자가 직접 커스텀할
// 수 있는 [3D World Builder]로 개편하면서 신설한 설정 저장 스키마.
// site_settings(key-value, EPIC-026부터 있던 기존 패턴) 아래
// "about_silo_universe" 키 하나에 전체 씬 구성을 JSON으로 저장한다 —
// 카메라/모델 경로/별 개수/선 색상/배경 모드까지 전부 이 한 객체에 담겨
// 자동저장/수동저장 둘 다 이 타입 하나만 직렬화하면 된다(지시문 5번).

export type UniverseObject = {
  id: string;
  /** 업로드된 .glb 모델의 public URL. */
  url: string;
  /** SILO 행성 표면 기준 스케일. */
  scale: number;
  label: string;
};

export type UniverseConfig = {
  // 배경(Item 6 인접) — 유튜브 프리셋 URL을 관리자가 직접 추가/삭제.
  backgroundMode: "youtube" | "preset";
  preset: "cream" | "deepBlue" | "watercolor";
  youtubeUrls: string[];

  // 행성(Item 8) — 텍스처 업로드가 있으면 절차적 수채화 대신 그 이미지를 쓴다.
  planetColor: string;
  planetTextureUrl: string;
  showThumbnails: boolean;
  orbitSpeed: number;

  // 궤도 데이터 소스(Item 2) — 비어있으면 기존처럼 전체 게시판 통합 피드.
  boardSlug: string;

  // 캐릭터(Item 1/4) — 업로드된 .glb가 있으면 그걸 쓰고, 없으면 기존
  // 절차적 실루엣(A/B/C)으로 폴백한다. animationClip은 로드된 GLTF 안의
  // 클립 이름(관리자가 UI에서 고른 값)을 그대로 저장.
  characterModelUrl: string;
  characterAnimationClip: string;
  characterType: "A" | "B" | "C";

  chestVariant: "classic" | "gold" | "dark";
  cameraVariant: "vintage" | "black" | "polaroid";

  // 실뜨개 연결선 색상(Item 5).
  lineColor: string;

  // 오브젝트 업로더(Item 3/4) — SILO 행성 표면에 마운트되는 장식 모델들.
  objects: UniverseObject[];

  // 자동 저장(Item 7).
  autoSaveEnabled: boolean;
};

export function defaultUniverseConfig(): UniverseConfig {
  return {
    backgroundMode: "youtube",
    preset: "cream",
    youtubeUrls: [
      "https://www.youtube.com/watch?v=IcVd-1A7Qfs",
      "https://www.youtube.com/watch?v=tBliA0MC-vo",
      "https://www.youtube.com/watch?v=Z9QUtjUq0HM",
      "https://www.youtube.com/watch?v=JtKLIjKaLYg",
      "https://www.youtube.com/watch?v=3u0sdGrIbeg&t=10037s",
      "https://www.youtube.com/watch?v=A7RuRAUEyUc",
      "https://www.youtube.com/watch?v=fe1-y15rVjc",
      "https://www.youtube.com/watch?v=IWVJq-4zW24",
    ],
    planetColor: "#e3a874",
    planetTextureUrl: "",
    showThumbnails: false,
    orbitSpeed: 0.15,
    boardSlug: "",
    characterModelUrl: "",
    characterAnimationClip: "",
    characterType: "A",
    chestVariant: "classic",
    cameraVariant: "vintage",
    lineColor: "#f2e2b8",
    objects: [],
    autoSaveEnabled: true,
  };
}

export function normalizeUniverseConfig(raw: unknown): UniverseConfig {
  const defaults = defaultUniverseConfig();
  if (!raw || typeof raw !== "object") return defaults;
  const value = raw as Partial<UniverseConfig>;
  return {
    ...defaults,
    ...value,
    youtubeUrls: Array.isArray(value.youtubeUrls) && value.youtubeUrls.length > 0 ? value.youtubeUrls : defaults.youtubeUrls,
    objects: Array.isArray(value.objects) ? value.objects : defaults.objects,
  };
}
