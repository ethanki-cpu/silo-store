// EPIC-119/EPIC-121/HOTFIX-123: /about-silo 3D 우주("사일로의 우주")를 관리자가
// 직접 커스텀할 수 있는 [3D World Builder]로 개편하면서 신설한 설정 저장
// 스키마. site_settings(key-value, EPIC-026부터 있던 기존 패턴) 아래
// "about_silo_universe" 키 하나에 전체 씬 구성을 JSON으로 저장한다 —
// 카메라/모델 경로/별 개수/선 색상/배경 모드까지 전부 이 한 객체에 담겨
// 자동저장/수동저장 둘 다 이 타입 하나만 직렬화하면 된다.
//
// HOTFIX-123(사용자 지시 — "다른 행성도 마찬가지로 오브제를 설정할 수 있게
// 해주고, 행성을 orbit하는 위성 디자인도 업로드할 수 있게 해줘. 그냥 SILO
// 행성 설정과 똑같이 설정 가능하게 해줘"): 이전까지는 planetName/
// planetColor/characterModelUrl/objects/boardSlug 등이 전부 SILO 행성
// 전용으로 UniverseConfig 최상위에 평평하게 있었고, 유저 행성은 색상 하나
// 빼고는 설정이 아예 불가능한 하드코딩이었다 — 이제 행성별로 동일한 필드
// 묶음(PlanetConfig)을 갖도록 `planets: { silo, user }`로 재구성한다. 기존
// 저장된 평평한 필드는 normalizeUniverseConfig()가 자동으로 planets.silo로
// 마이그레이션해 하위 호환한다(라이브 DB의 기존 저장값이 깨지지 않도록).
export type UniverseObject = {
  id: string;
  /** 업로드된 .glb 모델의 public URL. */
  url: string;
  /** 행성 표면 기준 스케일. */
  scale: number;
  label: string;
  // EPIC-121(사용자 지시 — "오브제를 드래그앤드랍할 수 있게"): 관리자가
  // 3D 뷰에서 직접 끌어다 놓은 위치(행성 중심 기준 로컬 오프셋). null이면
  // 아직 한 번도 드래그하지 않은 것 — 자동 기본 배치를 쓴다.
  position: [number, number, number] | null;
  // HOTFIX-123(사용자 지시 — "오브제를 클릭했을 때 나오는 썸네일과 요약,
  // 그리고 링크를 설정할 수 있게 해줘"): 오브제를 클릭하면 뜨는 정보
  // 카드에 쓰인다. 전부 비어있으면 카드를 띄우지 않는다.
  thumbnailUrl: string;
  summary: string;
  link: string;
};

// HOTFIX(사용자 지시 — "universe setting에서 오브제를 업로드할 수 있는
// 게 없네, 예를 들어 별, 은하수, 별똥별, asteroid 등등 우주에 있는
// 것들 말이야. 추가해줘"): 행성 표면에 "중력"으로 붙는 UniverseObject와
//달리, 이 오브젝트들은 두 행성 사이 우주 공간에 자유롭게 떠 있다 —
// kind가 "model"이면 .glb 3D 모델(asteroid 등, useGLTF로 로드), "sprite"
// 면 항상 카메라를 향하는 이미지 빌보드(별/은하수/별똥별 등, 사진 한 장
// 이면 충분한 것들). 나머지 필드는 UniverseObject와 동일한 구조를
// 공유해 ObjectInspectorPanel/ObjectInfoCard를 그대로 재사용한다.
export type SpaceObject = UniverseObject & { kind: "model" | "sprite" };

// HOTFIX-123: 행성 하나가 갖는 설정 묶음 — SILO/유저 행성이 동일한 구조를
// 공유한다(사용자 지시 — "그냥 SILO 행성 설정과 똑같이").
export type PlanetConfig = {
  name: string;
  color: string;
  textureUrl: string;
  // 0이면 색만, 1이면 텍스처만 — 그 사이는 두 레이어를 겹쳐 블렌드.
  textureOpacity: number;
  // 캐릭터 — 업로드된 .glb가 있으면 그걸 쓰고, 없으면 절차적 실루엣(A/B/C)
  // 으로 폴백한다.
  characterModelUrl: string;
  characterAnimationClip: string;
  characterType: "A" | "B" | "C";
  // 이 행성 표면에 배치되는 장식 오브젝트들.
  objects: UniverseObject[];
  // 이 행성을 도는 궤도 위성(게시글 마커) 데이터 소스 — 비어있으면 전체
  // 게시판 통합 피드.
  boardSlug: string;
  // HOTFIX-123(사용자 지시 — "위성의 디자인을 업로드할 수 있게 해줘"):
  // 업로드하면 기본 별(팔면체) 모양 대신 이 이미지를 위성 마커로 쓴다.
  satelliteDesignUrl: string;
};

export type UniverseConfig = {
  backgroundMode: "youtube" | "preset";
  preset: "cream" | "deepBlue" | "watercolor";
  youtubeUrls: string[];

  /** @deprecated HOTFIX-122: 궤도 마커가 항상 작은 별 모양으로 바뀌면서
   * 이 on/off 토글이 필요 없어졌다 — 기존 저장된 DB 값과의 하위 호환을
   * 위해 타입만 남겨둔다(아무 코드도 안 읽음). */
  showThumbnails: boolean;
  orbitSpeed: number;

  chestVariant: "classic" | "gold" | "dark";
  cameraVariant: "vintage" | "black" | "polaroid";

  // 실뜨개 연결선 색상.
  lineColor: string;

  // HOTFIX-123: 행성별 설정(이름/색/텍스처/캐릭터/오브젝트/위성 소스+디자인).
  planets: {
    silo: PlanetConfig;
    user: PlanetConfig;
  };

  // HOTFIX(사용자 지시 — "별, 은하수, 별똥별, asteroid 등등 우주에
  // 있는 것들"): 어느 행성에도 속하지 않는, 우주 공간에 자유롭게
  // 떠 있는 오브젝트.
  spaceObjects: SpaceObject[];

  // 자동 저장.
  autoSaveEnabled: boolean;
};

function defaultPlanetConfig(name: string, color: string): PlanetConfig {
  return {
    name,
    color,
    textureUrl: "",
    textureOpacity: 1,
    characterModelUrl: "",
    characterAnimationClip: "",
    characterType: "A",
    objects: [],
    boardSlug: "",
    satelliteDesignUrl: "",
  };
}

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
    showThumbnails: false,
    orbitSpeed: 0.15,
    chestVariant: "classic",
    cameraVariant: "vintage",
    lineColor: "#f2e2b8",
    planets: {
      silo: defaultPlanetConfig("SILO", "#e3a874"),
      user: defaultPlanetConfig("My Page", "#c3d8b8"),
    },
    spaceObjects: [],
    autoSaveEnabled: true,
  };
}

function normalizeObject(raw: unknown): UniverseObject {
  const o = (raw ?? {}) as Partial<UniverseObject>;
  return {
    id: o.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: o.url ?? "",
    scale: typeof o.scale === "number" ? o.scale : 0.3,
    label: o.label ?? "",
    position: Array.isArray(o.position) ? o.position : null,
    thumbnailUrl: o.thumbnailUrl ?? "",
    summary: o.summary ?? "",
    link: o.link ?? "",
  };
}

function normalizePlanetConfig(raw: unknown, fallback: PlanetConfig): PlanetConfig {
  if (!raw || typeof raw !== "object") return fallback;
  const value = raw as Partial<PlanetConfig>;
  return {
    ...fallback,
    ...value,
    objects: Array.isArray(value.objects) ? value.objects.map(normalizeObject) : fallback.objects,
  };
}

export function normalizeUniverseConfig(raw: unknown): UniverseConfig {
  const defaults = defaultUniverseConfig();
  if (!raw || typeof raw !== "object") return defaults;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB jsonb는 임의 과거 스키마를 담고 있어 unknown보다 any로 필드별 존재 여부를 직접 확인하는 게 마이그레이션 로직상 더 명확하다.
  const value = raw as any;

  // HOTFIX-123 마이그레이션: planets 필드가 없는 옛 저장값(EPIC-119~
  // HOTFIX-122 시절의 평평한 스키마 — planetName/planetColor/objects 등이
  // 최상위에 있었음)이면 그 필드들을 planets.silo로 옮겨 하위 호환한다.
  const legacySilo: Partial<PlanetConfig> | null =
    !value.planets && (value.planetName !== undefined || value.objects !== undefined)
      ? {
          name: value.planetName,
          color: value.planetColor,
          textureUrl: value.planetTextureUrl,
          textureOpacity: value.planetTextureOpacity,
          characterModelUrl: value.characterModelUrl,
          characterAnimationClip: value.characterAnimationClip,
          characterType: value.characterType,
          objects: value.objects,
          boardSlug: value.boardSlug,
        }
      : null;

  const planetsRaw = value.planets ?? {};
  return {
    ...defaults,
    ...value,
    youtubeUrls: Array.isArray(value.youtubeUrls) && value.youtubeUrls.length > 0 ? value.youtubeUrls : defaults.youtubeUrls,
    planets: {
      silo: normalizePlanetConfig(legacySilo ?? planetsRaw.silo, defaults.planets.silo),
      user: normalizePlanetConfig(planetsRaw.user, defaults.planets.user),
    },
    spaceObjects: Array.isArray(value.spaceObjects)
      ? value.spaceObjects.map((o: unknown) => ({
          ...normalizeObject(o),
          kind: (o as Partial<SpaceObject>)?.kind === "sprite" ? "sprite" : "model",
        }))
      : defaults.spaceObjects,
  };
}
