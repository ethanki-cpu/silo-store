"use client";

import { useMemo, type CSSProperties } from "react";

// HOTFIX-165.1(사용자 지시 — "앨리스 depth의 카드: 한 면은 '이상한 나라의 앨리스' 등장인물, 다른 면은 일반 트럼프 카드 2~10·J·Q·K·A(조커도)"):
// 떨어지는 카드 한 장 = 앞면(등장인물 이미지 — 관리자가 올린 이미지, 없으면 이모지 카드) + 뒷면(진짜 트럼프 카드 무늬, DOM/CSS로 그림).
// WebGL 텍스처는 R2 이미지에 CORS가 없어 못 읽으므로 DOM + CSS 3D(preserve-3d, backface-visibility)로 만든다 — 올린 이미지도 그대로 쓸 수 있다.
const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
type Suit = (typeof SUITS)[number];
type Rank = (typeof RANKS)[number];

// 표준 트럼프의 무늬(pip) 배치 — x: 왼/가운데/오른쪽 열, y: 0~1(위→아래). y>0.5는 뒤집어 그린다.
const L = 0.29;
const C = 0.5;
const R = 0.71;
const PIPS: Record<string, [number, number][]> = {
  "2": [[C, 0.14], [C, 0.86]],
  "3": [[C, 0.14], [C, 0.5], [C, 0.86]],
  "4": [[L, 0.14], [R, 0.14], [L, 0.86], [R, 0.86]],
  "5": [[L, 0.14], [R, 0.14], [C, 0.5], [L, 0.86], [R, 0.86]],
  "6": [[L, 0.14], [R, 0.14], [L, 0.5], [R, 0.5], [L, 0.86], [R, 0.86]],
  "7": [[L, 0.14], [R, 0.14], [C, 0.32], [L, 0.5], [R, 0.5], [L, 0.86], [R, 0.86]],
  "8": [[L, 0.14], [R, 0.14], [C, 0.32], [L, 0.5], [R, 0.5], [C, 0.68], [L, 0.86], [R, 0.86]],
  "9": [[L, 0.14], [R, 0.14], [L, 0.38], [R, 0.38], [C, 0.5], [L, 0.62], [R, 0.62], [L, 0.86], [R, 0.86]],
  "10": [[L, 0.14], [R, 0.14], [C, 0.26], [L, 0.38], [R, 0.38], [L, 0.62], [R, 0.62], [C, 0.74], [L, 0.86], [R, 0.86]],
};

const isRed = (s: Suit) => s === "♥" || s === "♦";
const FACE_NAMES: Record<string, string> = { J: "잭", Q: "퀸", K: "킹" };

function PlayingCardFace({ rank, suit, joker }: { rank: Rank; suit: Suit; joker?: boolean }) {
  const ink = joker ? "#5b1fa8" : isRed(suit) ? "#c1121f" : "#161624";
  const base: CSSProperties = { position: "absolute", inset: 0, background: "linear-gradient(160deg,#ffffff,#f4efe4)", borderRadius: "7%", border: "1px solid #b9b3a4", boxShadow: "inset 0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,.35)", color: ink, backfaceVisibility: "hidden", transform: "rotateY(180deg)", overflow: "hidden", fontFamily: 'Georgia,"Times New Roman",serif' };
  if (joker) {
    return (
      <div style={base}>
        <span style={{ position: "absolute", left: "8%", top: "5%", fontSize: "0.5em", fontWeight: 700, writingMode: "vertical-rl", letterSpacing: "0.1em" }}>JOKER</span>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.4em" }}>🃏</span>
        <span style={{ position: "absolute", right: "8%", bottom: "5%", fontSize: "0.5em", fontWeight: 700, writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.1em" }}>JOKER</span>
      </div>
    );
  }
  const pips = PIPS[rank];
  const corner = (flip: boolean): CSSProperties => ({ position: "absolute", [flip ? "right" : "left"]: "7%", [flip ? "bottom" : "top"]: "4%", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, fontWeight: 700, transform: flip ? "rotate(180deg)" : undefined });
  return (
    <div style={base}>
      <span style={corner(false)}>
        <span style={{ fontSize: "1.05em" }}>{rank}</span>
        <span style={{ fontSize: "0.95em" }}>{suit}</span>
      </span>
      <span style={corner(true)}>
        <span style={{ fontSize: "1.05em" }}>{rank}</span>
        <span style={{ fontSize: "0.95em" }}>{suit}</span>
      </span>
      {pips ? (
        <span style={{ position: "absolute", left: "18%", right: "18%", top: "14%", bottom: "14%" }}>
          {pips.map(([x, y], i) => (
            <span key={i} style={{ position: "absolute", left: `${((x - 0.18) / 0.64) * 100}%`, top: `${((y - 0.14) / 0.72) * 100}%`, transform: `translate(-50%,-50%)${y > 0.5 ? " rotate(180deg)" : ""}`, fontSize: "1.15em", lineHeight: 1 }}>
              {suit}
            </span>
          ))}
        </span>
      ) : rank === "A" ? (
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3em" }}>{suit}</span>
      ) : (
        // J·Q·K — 테두리 안에 큰 글자와 무늬
        <span style={{ position: "absolute", left: "20%", right: "20%", top: "15%", bottom: "15%", border: `1px solid ${ink}`, borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `linear-gradient(160deg, ${ink}12, transparent)` }}>
          <span style={{ fontSize: "2.1em", fontWeight: 700, lineHeight: 1 }}>{rank}</span>
          <span style={{ fontSize: "1.3em", lineHeight: 1.1 }}>{suit}</span>
          <span style={{ fontSize: "0.42em", letterSpacing: "0.1em", opacity: 0.7 }}>{FACE_NAMES[rank]}</span>
        </span>
      )}
    </div>
  );
}

// 이미지가 없을 때의 앞면(이상한 나라 등장인물) — 관리자가 캐릭터 이미지를 올리면 그 이미지로 대체된다.
const CHARACTERS = [
  { e: "🐇", n: "WHITE RABBIT" },
  { e: "🎩", n: "MAD HATTER" },
  { e: "😸", n: "CHESHIRE CAT" },
  { e: "👑", n: "QUEEN OF HEARTS" },
  { e: "💂", n: "CARD SOLDIER" },
  { e: "🐛", n: "CATERPILLAR" },
];
function CharacterFace({ image, index }: { image?: string; index: number }) {
  const ch = CHARACTERS[index % CHARACTERS.length];
  const frame: CSSProperties = { position: "absolute", inset: 0, borderRadius: "7%", border: "2px solid #c9a94f", boxShadow: "0 2px 10px rgba(0,0,0,.4), inset 0 0 0 2px #fff6dc", backfaceVisibility: "hidden", overflow: "hidden", background: "linear-gradient(160deg,#fffaf0,#f1e6cc)" };
  if (image) {
    return (
      <div style={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={frame}>
      <span style={{ position: "absolute", inset: "9% 9% 20% 9%", border: "1px solid #d9bd6a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.2em", background: "radial-gradient(circle at 50% 40%, #fff, #f6ecd6)" }}>{ch.e}</span>
      <span style={{ position: "absolute", left: 0, right: 0, bottom: "6%", textAlign: "center", fontSize: "0.42em", fontWeight: 700, letterSpacing: "0.08em", color: "#6b4f10", fontFamily: "Georgia,serif" }}>{ch.n}</span>
    </div>
  );
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CARD_KEYFRAMES = `
@keyframes silo-card-fall{0%{transform:translate3d(0,-28vh,0) rotate(var(--r0))}50%{transform:translate3d(var(--sw),44vh,0) rotate(calc(var(--r0) * -.6))}100%{transform:translate3d(calc(var(--sw) * -.5),128vh,0) rotate(calc(var(--r0) * .8))}}
@keyframes silo-card-flip{0%{transform:rotateY(0deg) rotateX(12deg)}100%{transform:rotateY(360deg) rotateX(12deg)}}
`;

export function FallingCards({ faces }: { faces: string[] }) {
  const cards = useMemo(() => {
    const r = rng(1701);
    return Array.from({ length: 15 }, (_, i) => {
      const joker = i % 7 === 3;
      return {
        left: 2 + r() * 96,
        w: 62 + r() * 56,
        dur: 12 + r() * 12,
        delay: -r() * 24,
        flip: 5 + r() * 7,
        sw: (r() * 2 - 1) * 14,
        r0: (r() * 2 - 1) * 24,
        rank: RANKS[Math.floor(r() * RANKS.length)],
        suit: SUITS[Math.floor(r() * SUITS.length)],
        joker,
        face: i,
      };
    });
  }, []);
  return (
    <div className="absolute inset-0" style={{ perspective: 1000 }}>
      <style>{CARD_KEYFRAMES}</style>
      {cards.map((c, i) => (
        <div key={i} className="absolute top-0" style={{ left: `${c.left}%`, width: c.w, height: c.w * 1.4, fontSize: c.w * 0.14, ["--sw" as string]: `${c.sw}vw`, ["--r0" as string]: `${c.r0}deg`, animation: `silo-card-fall ${c.dur}s linear ${c.delay}s infinite` } as CSSProperties}>
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", animation: `silo-card-flip ${c.flip}s linear ${c.delay}s infinite` }}>
            <CharacterFace image={faces.length > 0 ? faces[c.face % faces.length] : undefined} index={c.face} />
            <PlayingCardFace rank={c.rank} suit={c.suit} joker={c.joker} />
          </div>
        </div>
      ))}
    </div>
  );
}
