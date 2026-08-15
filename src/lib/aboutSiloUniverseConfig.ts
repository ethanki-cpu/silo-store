// EPIC-119/EPIC-121: /about-silo 3D 우주("사일로의 우주")를 관리자가 직접
// 커스텀할 수 있는 [3D World Builder]로 개편하면서 신설한 설정 저장
// 스키마. site_settings(key-value, EPIC-026부터 있던 기존 패턴) 아래
// "about_silo_universe" 키 하나에 전체 씬 구성을 JSON으로 저장한다 —
// 카메라/모델 경로/별 개수/선 색상/배경 모드까지 전부 이 한 객체에 담겨
// 자동저장/수동저장 둘 다 이 타입 하나만 직렬화하면 된다(지시문 5번).
//
// EPIC-121(사용자 지시): Leva(별도 우측 상단 패널)를 완전히 걷어내고
// UniverseSettingsPanel(좌측 하단) 하나로 합쳤다 — 그래서 예전엔 Leva가
// 따로 들고 있던 backgroundMode/preset/planetColor/showThumbnails/
// orbitSpeed/characterType/chestVariant/cameraVariant/lineColor도 전부
// 이 타입/panelConfig state가 유일한 출처가 됐다(이전엔 Leva 쪽과
// 이중으로 관리돼 로드 시점에만 동기화했음).
export type UniverseObject = {
  id: string;
  /** 업로드된 .glb 모델의 public URL. */
  url: string;
  /** SILO 행성 표면 기준 스케일. */
  scale: number;
  label: string;
  // EPIC-121(사용자 지시 — "오브제를 드래그앤드랍할 수 있게"): 관리자가
  // 3D 뷰에서 직접 끌어다 놓은 위치(행성 중심 기준 로컬 오프셋). null이면
  // 아직 한 번도 드래그하지 않은 것 — 자동 기본 배치(전면 클러스터)를 쓴다.
  position: [number, number, number] | null;
};

export type UniverseConfig = {
  backgroundMode: "youtube" | "preset";
  preset: "cream" | "deepBlue" | "watercolor";
  youtubeUrls: string[];

  // EPIC-121(사용자 지시): 행성 이름(SILO 행성 위에 라벨로 표시).
  planetName: string;
  planetColor: string;
  planetTextureUrl: string;
  // EPIC-121(사용자 지시 — "행성 색과 텍스처가 섞일 수 있게, 투명도 설정
  // 가능하게"): 0이면 색만, 1이면 텍스처만 — 그 사이는 두 레이어를 겹쳐
  // 블렌드(AboutSiloUniverse.tsx의 PlanetMaterial 참고).
  planetTextureOpacity: number;
  /** @deprecated HOTFIX-122: 궤도 마커가 항상 작은 별 모양(hover 시 사진
   * 미리보기)으로 바뀌면서 이 on/off 토글이 필요 없어졌다 — 기존 저장된
   * DB 값과의 하위 호환을 위해 타입만 남겨둔다(아무 코드도 안 읽음). */
  showThumbnails: boolean;
  orbitSpeed: number;

  // 궤도 데이터 소스 — 비어있으면 기존처럼 전체 게시판 통합 피드.
  boardSlug: string;

  // 캐릭터 — 업로드된 .glb가 있으면 그걸 쓰고, 없으면 기존 절차적 실루엣
  // (A/B/C)으로 폴백한다. animationClip은 로드된 GLTF 안의 클립 이름.
  characterModelUrl: string;
  characterAnimationClip: string;
  characterType: "A" | "B" | "C";

  chestVariant: "classic" | "gold" | "dark";
  cameraVariant: "vintage" | "black" | "polaroid";

  // 실뜨개 연결선 색상.
  lineColor: string;

  // 오브젝트 업로더 — SILO 행성 표면에 마운트되는 장식 모델들.
  objects: UniverseObject[];

  // 자동 저장.
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
    planetName: "SILO",
    planetColor: "#e3a874",
    planetTextureUrl: "",
    planetTextureOpacity: 1,
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
    objects: Array.isArray(value.objects)
      ? value.objects.map((o) => ({ ...o, position: o.position ?? null }))
      : defaults.objects,
  };
}
