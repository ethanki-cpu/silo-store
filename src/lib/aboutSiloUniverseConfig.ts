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
// HOTFIX-140.4(사용자 지시 — "오브제들이 반짝이는 효과가 없는거 같은데,
// 그 모션 효과를 여러가지 오브제마다 설정할수 있게 해줘"): 오브제(행성
// 표면 장식/우주 공간 오브젝트 공통)마다 고를 수 있는 유휴 모션 프리셋 —
// tabHoverMotion.ts가 이미 쓰는 "여러 프리셋 중 선택" 패턴을 3D 오브젝트에
// 적용한다. "pulse"(크기 변화)는 일부러 넣지 않았다 — 카메라 클릭-줌
// 거리가 오브젝트의 실제 바운딩 반지름에 비례해 계산되는데(HOTFIX-132.1),
// 스케일을 주기적으로 바꾸면 그 계산이 매 프레임 어긋나 줌 거리가
// 흔들린다. 그래서 이 4개는 전부 위치/회전/불투명도만 바꾼다(스케일은
// 절대 안 건드림) — 카메라 로직과 완전히 독립적으로 안전하게 얹을 수 있다.
// EPIC-144(사용자 지시 — "모션효과가 위아래 부유 말고 작동이 안돼,
// 10가지 모션이 더 있으면좋겠어"): "spin"이 이미지 빌보드(SpaceObjectSprite)
// 에서 시각적으로 아예 안 보이던 버그가 있었다 — Three.js의 Sprite는
// 항상 카메라를 향해 스스로 방향을 재계산해서(billboarding) 부모 group의
// rotation을 무시한다. AboutSiloUniverse.tsx가 스프라이트에는 group
// 회전 대신 SpriteMaterial.rotation(2D 평면 회전, sprite 고유 속성이라
// billboarding과 무관하게 실제로 보인다)을 대신 쓰도록 고쳤다 — 이 타입
// 자체는 그대로다. 아래 10개가 신규 프리셋 — 전부 기존 규칙 그대로
// position/rotation/opacity만 쓰고 scale은 절대 안 건드린다(카메라 줌
// 거리가 바운딩 반지름에 비례해 계산되므로).
export type ObjectMotion =
  | "none"
  | "twinkle"
  | "bob"
  | "spin"
  | "sway"
  | "pendulum"
  | "tumble"
  | "drift"
  | "orbitSelf"
  | "figure8"
  | "flicker"
  | "shimmer"
  | "fadeInOut"
  | "nod";

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
  // HOTFIX(사용자 지시 — "그 오브제들을 클릭했을 때... 연결된 게시판의
  // 썸네일과 게시판에 대한 설명이 올라오게 해주고... 관리자 창에는
  // 어떤 게시판 링크로 연결되는지"): boards.slug — 설정하면 정보 카드가
  // 이 게시판의 실제 name/description/thumbnail_url을 자동으로
  // 가져와 보여준다(단, thumbnailUrl/summary를 직접 입력해뒀으면 그
  // 수동 입력값이 우선한다 — "게시판 썸네일/설명을 수정할 수 있게"라는
  // 요청을 게시판 원본 레코드를 건드리지 않고 오브제 단위 오버라이드로
  // 구현). 비어있으면(게시판 미연결) 기존처럼 thumbnailUrl/summary/link
  // 수동 입력만으로 카드를 구성한다.
  boardSlug: string;
  // HOTFIX-132.1(사용자 지시 — "오브젝트 설정 UI에 '클릭 시 줌인 거리'
  // 슬라이더를 추가해, 관리자가 오브젝트마다 카메라가 멈추는 거리를
  // 직접 미세 조정할 수 있게 하라"): null이면 오브젝트의 실제 바운딩
  // 박스 크기에서 자동 계산(AboutSiloUniverse.tsx의 focusCameraOnObject
  // 참고) — 값을 넣으면 그 배율(바운딩 반지름의 몇 배 거리에서 멈출지)
  // 로 강제 오버라이드한다.
  focusDistanceMultiplier: number | null;
  // HOTFIX-140.4: 없으면(undefined) 렌더링하는 쪽이 종류별 기본값으로
  // 폴백한다(우주 공간 이미지 빌보드는 "twinkle", 그 외엔 "none") —
  // normalize에서 강제로 채우지 않고 렌더 시점 기본값으로 남겨, 관리자가
  // 명시적으로 "없음"을 고른 것과 "아직 한 번도 안 고른 것"을 구분하지
  // 않아도 되게 한다(어차피 의미상 차이가 없음).
  motion?: ObjectMotion;
  // HOTFIX-144.6(사용자 지시 — "오브제들을 회전할수 있게 해줘. 드래그
  // 드롭으로"): 오브젝트가 서 있는 자리(행성 표면 법선/우주 공간 identity)를
  // 기준으로 한 로컬 Y축(위쪽) 추가 회전(라디안). AboutSiloUniverse.tsx의
  // TransformControls가 "회전" 모드일 때 이 축으로만 드래그해 정하고,
  // 렌더링 쪽이 기존 배치 orientation 위에 이 값을 곱해서 적용한다.
  yaw: number;
};

// HOTFIX(사용자 지시 — "universe setting에서 오브제를 업로드할 수 있는
// 게 없네, 예를 들어 별, 은하수, 별똥별, asteroid 등등 우주에 있는
// 것들 말이야. 추가해줘"): 행성 표면에 "중력"으로 붙는 UniverseObject와
//달리, 이 오브젝트들은 두 행성 사이 우주 공간에 자유롭게 떠 있다 —
// kind가 "model"이면 .glb 3D 모델(asteroid 등, useGLTF로 로드), "sprite"
// 면 항상 카메라를 향하는 이미지 빌보드(별/은하수/별똥별 등, 사진 한 장
// 이면 충분한 것들). 나머지 필드는 UniverseObject와 동일한 구조를
// 공유해 ObjectInspectorPanel/ObjectInfoCard를 그대로 재사용한다.
// C4(사용자 지시 — "'별/은하수 이미지 추가'로 추가한 이미지들이 무작위로
// 우주 공간에 몇개 랜덤 공간에 떠다니는지 설정할수 있게 해줘"): 하나의
// 업로드(하나의 url)가 몇 개의 무작위 배치 사본으로 흩뿌려질지(count,
// 기본 1) + "다시 무작위 배치" 버튼을 누를 때마다 바뀌는 값
// (scatterSeed, 기본 0) — 위치 해시에 섞여 들어가 같은 count라도 매번
// 다른 배치를 뽑을 수 있게 한다. count가 2 이상이면 obj.position(단일
// 드래그 위치)은 무시되고 전부 무작위 배치로만 렌더링된다(여러 사본을
// 각각 따로 드래그해 옮기는 개념 자체가 없음 — 순수 배경 장식이라는
// 전제).
// EPIC-144(사용자 지시 — "먼곳에 은하수, 블랙홀, nebula... 내가 glb
// 파일 넣을수 있게 우주의 먼곳에 보일수 있게 하고 크기 설정할수 있게해"):
// 기존엔 흩뿌림 범위가 "두 행성 사이"(반지름 7~16 정도) 고정이라 은하수/
// 블랙홀/네뷸러처럼 아주 멀리 떨어진 배경으로는 못 썼다 — "distant"를
// 고르면 훨씬 먼 반지름(scatterInSpace 참고)에 배치돼 깊은 우주 배경처럼
// 보인다. "between"(기본값)은 기존 동작 그대로 하위 호환.
export type SpacePlacement = "between" | "distant";

export type SpaceObject = UniverseObject & {
  kind: "model" | "sprite";
  count: number;
  scatterSeed: number;
  placement: SpacePlacement;
};

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
  // EPIC-144(사용자 지시 — "각 행성의 크기도 설정할수 있게해줘"): 행성
  // 반지름 배율 — 1이 기존 기본 크기. 표면 오브젝트 배치 반지름/캐릭터
  // 위치/라벨 위치/위성 궤도 반지름/카메라 포커스 거리가 전부 이 배율에
  // 비례해 함께 커지거나 작아진다(AboutSiloUniverse.tsx 참고) — 행성만
  // 커지고 그 위 오브젝트/위성이 파묻히거나 등등 뜨는 일이 없도록.
  sizeScale: number;
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

  // 실뜨개 연결선 색상.
  lineColor: string;

  // HOTFIX-140.4(사용자 지시 — "오브제를 클릭했을때, 하늘색 구체가
  // 안보이게 해줘... 표면에 얇은 하이라이트가 되게만 해줘"): 필드 이름은
  // 하위 호환을 위해 그대로 뒀지만 의미가 "감싸는 구체 opacity"에서
  // "표면을 따라 그리는 얇은 외곽선(drei Outlines)의 opacity"로 바뀌었다
  // — AboutSiloUniverse.tsx의 SelectionOutline 참고.
  selectionGlowOpacity: number;

  // EPIC-144(사용자 지시 — "줌인 줌아웃이 너무 조금씩 되니까 답답해"):
  // CameraControls의 dollySpeed를 그대로 노출 — 예전엔 0.55로 하드코딩돼
  // 있었다. 값이 클수록 휠 한 번에 더 크게 줌된다.
  zoomSpeed: number;

  // HOTFIX-123: 행성별 설정(이름/색/텍스처/캐릭터/오브젝트/위성 소스+디자인).
  planets: {
    silo: PlanetConfig;
    user: PlanetConfig;
  };

  // HOTFIX-140.4(사용자 지시 — "'우주'인데 별똥별 효과... 옵션도
  // 추가해줘 랜덤으로 보이게 그리고 내가 설정할수 있게"): 별똥별은
  // 이전부터 코드에 있었지만(ShootingStars, AboutSiloUniverse.tsx)
  // 개수 4개 고정 + on/off·색상·속도 설정이 전혀 없었다 — 이제 관리자가
  // 직접 조절한다.
  // EPIC-144(사용자 지시 — "진짜같은 별똥별 효과(내가 설정한 오브제가
  // orbit 하고 tail 이 있음 반짝이는 tail)"): objectUrl/objectKind를
  // 설정하면 기본 막대 대신 업로드한 모델/이미지가 별똥별 머리로
  // 쓰인다(비우면 기존 막대 그대로, 하위 호환). tailLength는 반짝이는
  // 잔상 꼬리를 이루는 점의 개수 — 늘릴수록 꼬리가 길고 진해진다.
  // 궤적 자체도 직선에서 완만한 호(포물선)로 바꿔 "orbit"처럼 곡선을
  // 그리며 지나가게 했다(ShootingStars 참고).
  shootingStars: {
    enabled: boolean;
    count: number;
    color: string;
    /** 배속 — 1이면 기존 기본 속도 그대로. */
    speedMultiplier: number;
    objectUrl: string;
    objectKind: "model" | "sprite";
    tailLength: number;
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
    sizeScale: 1,
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
    lineColor: "#f2e2b8",
    selectionGlowOpacity: 0.5,
    // 기존에 CameraControls에 하드코딩돼 있던 값(0.55) 그대로 기본값으로.
    zoomSpeed: 0.55,
    planets: {
      silo: defaultPlanetConfig("SILO", "#e3a874"),
      user: defaultPlanetConfig("My Page", "#c3d8b8"),
    },
    // 기존에 하드코딩돼 있던 값(SHOOTING_STAR_COUNT=4, #fff8e0) 그대로
    // 기본값으로 삼아 — 저장된 적 없는 사이트는 지금까지와 똑같이 보인다.
    shootingStars: { enabled: true, count: 4, color: "#fff8e0", speedMultiplier: 1, objectUrl: "", objectKind: "model", tailLength: 10 },
    spaceObjects: [],
    autoSaveEnabled: true,
  };
}

const VALID_OBJECT_MOTIONS: ObjectMotion[] = [
  "none",
  "twinkle",
  "bob",
  "spin",
  "sway",
  "pendulum",
  "tumble",
  "drift",
  "orbitSelf",
  "figure8",
  "flicker",
  "shimmer",
  "fadeInOut",
  "nod",
];

function normalizeObject(raw: unknown): UniverseObject {
  const o = (raw ?? {}) as Partial<UniverseObject>;
  return {
    id: o.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: o.url ?? "",
    scale: typeof o.scale === "number" ? o.scale : 0.6,
    label: o.label ?? "",
    position: Array.isArray(o.position) ? o.position : null,
    thumbnailUrl: o.thumbnailUrl ?? "",
    summary: o.summary ?? "",
    link: o.link ?? "",
    boardSlug: o.boardSlug ?? "",
    focusDistanceMultiplier: typeof o.focusDistanceMultiplier === "number" ? o.focusDistanceMultiplier : null,
    motion: VALID_OBJECT_MOTIONS.includes(o.motion as ObjectMotion) ? o.motion : undefined,
    yaw: typeof o.yaw === "number" ? o.yaw : 0,
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
    zoomSpeed: typeof value.zoomSpeed === "number" && value.zoomSpeed > 0 ? value.zoomSpeed : defaults.zoomSpeed,
    spaceObjects: Array.isArray(value.spaceObjects)
      ? value.spaceObjects.map((o: unknown) => ({
          ...normalizeObject(o),
          kind: (o as Partial<SpaceObject>)?.kind === "sprite" ? "sprite" : "model",
          count: typeof (o as Partial<SpaceObject>)?.count === "number" && (o as Partial<SpaceObject>).count! >= 1 ? (o as Partial<SpaceObject>).count! : 1,
          scatterSeed: typeof (o as Partial<SpaceObject>)?.scatterSeed === "number" ? (o as Partial<SpaceObject>).scatterSeed! : 0,
          placement: (o as Partial<SpaceObject>)?.placement === "distant" ? "distant" : "between",
        }))
      : defaults.spaceObjects,
    shootingStars: {
      enabled: typeof value.shootingStars?.enabled === "boolean" ? value.shootingStars.enabled : defaults.shootingStars.enabled,
      count: typeof value.shootingStars?.count === "number" ? value.shootingStars.count : defaults.shootingStars.count,
      color: typeof value.shootingStars?.color === "string" && value.shootingStars.color ? value.shootingStars.color : defaults.shootingStars.color,
      speedMultiplier:
        typeof value.shootingStars?.speedMultiplier === "number" ? value.shootingStars.speedMultiplier : defaults.shootingStars.speedMultiplier,
      objectUrl: typeof value.shootingStars?.objectUrl === "string" ? value.shootingStars.objectUrl : defaults.shootingStars.objectUrl,
      objectKind: value.shootingStars?.objectKind === "sprite" ? "sprite" : "model",
      tailLength:
        typeof value.shootingStars?.tailLength === "number" ? value.shootingStars.tailLength : defaults.shootingStars.tailLength,
    },
  };
}
