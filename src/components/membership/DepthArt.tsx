// EPIC-163.2: 심연으로의 스크롤 각 깊이의 상징적 일러스트(직접 그린 SVG). 관리자가 위젯 설정에서 깊이별 이미지 URL을 넣으면 그 이미지가 우선한다.
// 색은 currentColor(글자색)와 accent(강조색) 두 가지만 써서 깊이마다 팔레트에 자연스럽게 어울린다.
type Art = { accent: string };

const S = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// 1. 문 앞 광장 — 첫눈이 내리는 밤, 가로등 아래 불이 켜진 아치형 문
function Plaza({ accent }: Art) {
  return (
    <g>
      <path {...S} d="M58 176V96a42 42 0 0 1 84 0v80z" />
      <path {...S} d="M70 176V100a30 30 0 0 1 60 0v76" />
      <path d="M78 176v-74a22 22 0 0 1 44 0v74z" fill={accent} opacity="0.35" />
      <circle cx="113" cy="140" r="3" fill="currentColor" />
      <path {...S} d="M22 176V78M22 78h16" />
      <circle cx="42" cy="78" r="7" fill={accent} opacity="0.9" />
      <circle cx="42" cy="78" r="15" fill={accent} opacity="0.22" />
      <path {...S} d="M14 176h172" />
      {[[30, 30], [70, 18], [104, 40], [140, 22], [170, 52], [52, 58], [158, 96], [182, 128], [16, 112], [92, 66]].map(([x, y], i) => (
        <g key={i} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
          <path d={`M${x - 4} ${y}h8M${x} ${y - 4}v8M${x - 3} ${y - 3}l6 6M${x + 3} ${y - 3}l-6 6`} />
        </g>
      ))}
    </g>
  );
}

// 2. 살롱의 서재 — 토끼굴로 이어지는 나선, 열쇠와 책
function Library({ accent }: Art) {
  return (
    <g>
      <path {...S} d="M100 100m-6 0a6 4 0 1 0 12 0a10 7 0 1 0-20 0a16 11 0 1 0 32 0a24 16 0 1 0-48 0a34 22 0 1 0 68 0a46 30 0 1 0-92 0" opacity="0.55" />
      <circle cx="100" cy="100" r="4" fill={accent} />
      <g transform="rotate(-38 100 100)">
        <circle {...S} cx="58" cy="100" r="17" />
        <circle cx="58" cy="100" r="6" fill={accent} opacity="0.85" />
        <path {...S} d="M75 100h72M128 100v16M142 100v12" />
      </g>
      <g transform="translate(112 132)">
        <rect {...S} x="0" y="0" width="52" height="11" rx="2" />
        <rect {...S} x="6" y="-11" width="46" height="11" rx="2" />
        <path {...S} d="M12 -5.5h20M8 5.5h24" opacity="0.6" />
      </g>
    </g>
  );
}

// 3. 살롱의 무도회장 — 샹들리에와 부딪히는 샴페인 잔
function Ballroom({ accent }: Art) {
  return (
    <g>
      <path {...S} d="M100 14v22" />
      <path {...S} d="M60 66c0-18 80-18 80 0M46 66h108" />
      <path {...S} d="M70 66c0 16 12 22 30 22s30-6 30-22" opacity="0.7" />
      {[54, 78, 100, 122, 146].map((x, i) => (
        <g key={x}>
          <path {...S} d={`M${x} 66v-12`} />
          <ellipse cx={x} cy="48" rx="3.4" ry="5.5" fill={accent} opacity="0.95" />
          <circle cx={x} cy="48" r="9" fill={accent} opacity={i === 2 ? 0.22 : 0.14} />
        </g>
      ))}
      <g transform="rotate(-14 74 150)">
        <path {...S} d="M62 104h24l-3 32c-1 8-17 8-18 0z" />
        <path {...S} d="M74 142v22M64 166h20" />
        <path d="M65 116h18l-1 14c-1 5-15 5-16 0z" fill={accent} opacity="0.5" />
      </g>
      <g transform="rotate(14 128 150)">
        <path {...S} d="M116 104h24l-3 32c-1 8-17 8-18 0z" />
        <path {...S} d="M128 142v22M118 166h20" />
        <path d="M119 116h18l-1 14c-1 5-15 5-16 0z" fill={accent} opacity="0.5" />
      </g>
      <path {...S} d="M100 96l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z" opacity="0.8" />
    </g>
  );
}

// 4. 비밀의 방 — 붉은 봉인이 찍힌 편지와 열쇠 구멍
function SecretRoom({ accent }: Art) {
  return (
    <g>
      <rect {...S} x="28" y="58" width="144" height="98" rx="6" />
      <path {...S} d="M28 64l72 52 72-52" />
      <circle cx="100" cy="116" r="22" fill={accent} opacity="0.92" />
      <circle {...S} cx="100" cy="116" r="17" strokeWidth="1.6" opacity="0.55" />
      <circle cx="100" cy="110" r="5" fill="currentColor" opacity="0.85" />
      <path d="M96 114h8l3 15h-14z" fill="currentColor" opacity="0.85" />
      <path {...S} d="M100 22l4 10 10 1-8 7 3 10-9-6-9 6 3-10-8-7 10-1z" opacity="0.7" />
    </g>
  );
}

// 5. 로트렉 — 몽마르트르 언덕 위 풍차와 별
function Windmill({ accent }: Art) {
  return (
    <g>
      <path {...S} d="M10 170c30-22 60-24 90-12s60 8 90-10" opacity="0.6" />
      <path {...S} d="M78 168l10-72h24l10 72z" />
      <path {...S} d="M84 96l16-14 16 14" />
      <path d="M92 168v-26a8 8 0 0 1 16 0v26z" fill={accent} opacity="0.55" />
      <g transform="rotate(20 100 84)">
        <path {...S} d="M100 84V28M100 84V140M100 84H44M100 84h56" />
        <path {...S} d="M100 28h14v22h-14zM100 140H86v-22h14zM44 84v-14h22v14zM156 84v14h-22V84z" />
      </g>
      <circle cx="100" cy="84" r="5" fill={accent} />
      <path {...S} d="M164 30l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z" opacity="0.75" />
      <path {...S} d="M34 44l2 5 5 1-4 4 1 5-4-3-4 3 1-5-4-4 5-1z" opacity="0.55" />
    </g>
  );
}

// 6. 아티스트 — 이젤 위의 캔버스, 팔레트와 붓, 월계관
function Artist({ accent }: Art) {
  return (
    <g>
      <path {...S} d="M100 22v10M62 176l30-124M138 176l-30-124M80 130h40" />
      <rect {...S} x="60" y="44" width="80" height="72" rx="3" />
      <path d="M66 108l24-34 16 20 12-14 22 28z" fill={accent} opacity="0.5" />
      <circle cx="122" cy="62" r="6" fill={accent} opacity="0.9" />
      <path {...S} d="M28 96c-8 22-2 50 20 66M172 96c8 22 2 50-20 66" opacity="0.65" />
      <path {...S} d="M30 112l-10-4M28 128l-11-1M32 144l-10 3M170 112l10-4M172 128l11-1M168 144l10 3" opacity="0.5" />
      <g transform="translate(150 150) rotate(-24)">
        <path {...S} d="M0 0c-16 0-22 10-16 20 8 10 22 2 22-6 0-4-4-6-6-6" />
        <circle cx="-14" cy="10" r="2.6" fill={accent} />
        <circle cx="-6" cy="16" r="2.6" fill="currentColor" />
        <circle cx="-18" cy="20" r="2.4" fill={accent} opacity="0.7" />
      </g>
    </g>
  );
}

const ARTS = [Plaza, Library, Ballroom, SecretRoom, Windmill, Artist];

export function DepthArt({ index, accent }: { index: number; accent: string }) {
  const Comp = ARTS[index % ARTS.length];
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-hidden>
      <Comp accent={accent} />
    </svg>
  );
}
