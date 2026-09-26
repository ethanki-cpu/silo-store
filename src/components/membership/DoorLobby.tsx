"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { uploadFileToR2 } from "@/lib/r2Upload";
import { DEFAULT_LOBBY_DOORS, type LobbyDoor } from "@/lib/membershipContentDefaults";

export { DEFAULT_LOBBY_DOORS };
export type { LobbyDoor };

// EPIC-165(사용자 지시 — "각 요소의 앤틱 문 이미지를 클릭하면 문이 열리면서, 그 문 뒤편에 설명하는 컨텐츠(캐러셀)가 등장"):
// 플랫폼의 핵심 요소마다 문 하나. 관리자가 올린 앤틱 문 사진이 문짝이 되고, 누르면 ① 카드 자리에서 화면 중앙으로 카메라가 줌인하고
// ② 문짝이 왼쪽 경첩을 축으로 3D로 열리며(문틈으로 빛이 샌다) ③ 문 뒤편에 설명 캐러셀이 떠오른다. 이미지가 없으면 빈 문틀만 보인다(문은 코드로 그리지 않는다).
const EASE = [0.16, 1, 0.3, 1] as const;
const SERIF = '"Noto Serif KR","Nanum Myeongjo",Georgia,serif';

function slidesOf(d: LobbyDoor): string[] {
  const extra = (d.extra ?? "")
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  return [d.description, ...extra].filter((x) => x && x.trim());
}

// 문짝(닫힌 면): 관리자가 올린 사진, 없으면 빈 문틀
function DoorFace({ door, big, admin }: { door: LobbyDoor; big?: boolean; admin?: boolean }) {
  const a = door.accent;
  if (door.imageUrl) {
    return (
      <>
        {/* HOTFIX-165.5(사용자 지시 — "PNG로 올렸으니 셰이딩 필요 없고, 잘리지 않고 같은 규격으로"): 배경·그라데이션·그림자 없이 원본 그대로(contain, 잘리지 않음), 모든 문이 같은 3:5 상자 안에서 바닥(아래) 기준으로 서 있다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={door.imageUrl} alt={door.title} draggable={false} className="absolute inset-0 h-full w-full object-contain object-bottom" />
      </>
    );
  }
  // 문 사진은 관리자가 직접 올린다 — 사진이 없을 땐 코드로 문을 그려 넣지 않고 빈 문틀만 둔다.
  return (
    <>
      <span className="absolute inset-0" style={{ background: "linear-gradient(160deg,#2a2536,#15121d)" }} />
      <span className="absolute inset-[7%] rounded-md" style={{ border: `1.5px dashed ${a}77` }} />
      {admin && !big && <span className="absolute inset-x-0 top-[42%] px-3 text-center text-[11px] text-white/60">앤틱 문 사진을<br />올려 주세요</span>}
    </>
  );
}

function LobbyOverlay({ door, from, onClose }: { door: LobbyDoor; from: DOMRect; onClose: () => void }) {
  const reduce = !!useReducedMotion();
  const a = door.accent;
  // EPIC-166: 문 사진에서 뽑은 팔레트가 있으면 화면 전체의 ambient(배경·방·빛)를 그 색으로, 없으면 지정한 빛 색(accent).
  const pal = door.palette && door.palette.length >= 4 ? door.palette : null;
  const c1 = pal?.[0] ?? a;
  const c2 = pal?.[1] ?? a;
  const c3 = pal?.[2] ?? a;
  const dark = pal?.[3] ?? "#14101c";
  const slides = slidesOf(door);
  const [idx, setIdx] = useState(0);
  const [opened, setOpened] = useState(false);
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const H = Math.min(vh * 0.8, 640);
  const W = Math.min(vw * 0.92, H * 0.62);
  const startX = from.left + from.width / 2 - vw / 2;
  const startY = from.top + from.height / 2 - vh / 2;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (opened && e.key === "ArrowRight") setIdx((i) => Math.min(slides.length - 1, i + 1));
      if (opened && e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, opened, slides.length]);

  return createPortal(
    <motion.div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label={`${door.title} 문`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: `radial-gradient(ellipse at 50% 42%, ${c1}55 0%, ${dark}e8 62%, ${dark}f7 100%)` }} onClick={onClose} />
      {/* 팔레트 색의 ambient 빛무리 — 천천히 떠다닌다 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <style>{`@keyframes silo-amb{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(var(--ax),var(--ay),0) scale(1.25)}}`}</style>
        {[c1, c2, c3].map((c, i) => (
          <span key={i} className="absolute rounded-full" style={{ width: "58vmax", height: "58vmax", left: ["-18%", "52%", "18%"][i], top: ["-24%", "8%", "52%"][i], background: `radial-gradient(circle, ${c}88 0%, transparent 66%)`, filter: "blur(34px)", ["--ax" as string]: ["6vw", "-7vw", "4vw"][i], ["--ay" as string]: ["5vh", "-4vh", "-6vh"][i], animation: `silo-amb ${15 + i * 5}s ease-in-out infinite` } as React.CSSProperties} />
        ))}
      </div>
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ width: W, height: H, marginLeft: -W / 2, marginTop: -H / 2, perspective: 1300 }}
        initial={reduce ? false : { x: startX, y: startY, scale: from.width / W }}
        animate={{ x: 0, y: 0, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.95, ease: EASE }}
      >
        {/* 문 뒤편의 방 — 설명 캐러셀 */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: reduce ? 0.1 : 1.0 }} className="absolute inset-0 flex flex-col overflow-hidden px-6 pb-5 pt-9 text-center text-white" style={{ borderRadius: "10px", background: `radial-gradient(ellipse at 12% 50%, ${c1}f2 0%, ${c2}88 34%, ${dark} 76%)`, boxShadow: `0 0 130px ${c1}88, inset 0 0 60px ${c2}44` }}>
          <div className="flex flex-1 items-center justify-center">
            {opened && (
              <AnimatePresence mode="wait">
                <motion.div key={idx} initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -16, filter: "blur(6px)" }} transition={{ duration: 0.6, ease: EASE }}>
                  {idx === 0 && (
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70" style={{ textShadow: "0 1px 8px rgba(0,0,0,.7)" }}>
                      {door.title}
                    </p>
                  )}
                  <p className="whitespace-pre-line break-keep text-[17px] leading-[1.9]" style={{ fontFamily: SERIF, textShadow: "0 2px 14px rgba(0,0,0,.85)" }}>
                    {slides[idx]}
                  </p>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
          {opened && (
            <motion.div className="mt-3 space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              {slides.length > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} aria-label="이전" className="rounded-full border border-white/40 px-2.5 py-0.5 text-sm disabled:opacity-30">
                    ‹
                  </button>
                  {slides.map((_, i) => (
                    <button key={i} type="button" onClick={() => setIdx(i)} aria-label={`${i + 1}번째`} className="h-2 rounded-full transition-all" style={{ width: i === idx ? 22 : 8, background: i === idx ? "#fff" : "rgba(255,255,255,.4)" }} />
                  ))}
                  <button type="button" onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))} disabled={idx === slides.length - 1} aria-label="다음" className="rounded-full border border-white/40 px-2.5 py-0.5 text-sm disabled:opacity-30">
                    ›
                  </button>
                </div>
              )}
              {door.href && (
                <Link href={door.href} onClick={onClose} className="inline-block rounded-full border border-white/70 bg-white/10 px-5 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">
                  {door.hrefLabel || "들어가기"} →
                </Link>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* 문짝: 왼쪽 경첩을 축으로 열린다(올린 PNG 그대로 — 배경·그림자 없음) */}
        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: "left center", backfaceVisibility: "hidden" }}
          initial={{ rotateY: 0 }}
          animate={reduce ? { opacity: 0 } : { rotateY: -112 }}
          transition={{ duration: reduce ? 0.4 : 1.25, ease: EASE, delay: reduce ? 0.1 : 0.85 }}
          onAnimationComplete={() => setOpened(true)}
        >
          <DoorFace door={door} big />
        </motion.div>
        {/* 문틈으로 새는 빛 */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -left-0.5 top-[6%] h-[88%] w-2 rounded-full"
          style={{ background: c1, boxShadow: `0 0 30px 14px ${c1}, 0 0 110px 44px ${c1}88`, backdropFilter: "blur(10px) brightness(1.6)", WebkitBackdropFilter: "blur(10px) brightness(1.6)" }}
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: [0, 1, 0.4], scaleX: [0.4, 2.6, 1.2] }}
          transition={{ duration: 1.4, delay: 0.85, ease: "easeOut" }}
        />
      </motion.div>
      <button type="button" onClick={onClose} aria-label="문 닫기" className="fixed right-4 top-4 rounded-full border border-white/50 bg-black/40 px-3 py-1 text-sm text-white backdrop-blur hover:bg-black/60">
        닫기 ✕
      </button>
    </motion.div>,
    document.body,
  );
}

export function DoorLobby({ heading, subtitle, doors: doorsProp, moduleId, settings, headerImageUrl, headerImageWidthPx }: { heading: string; subtitle: string; doors: LobbyDoor[]; moduleId?: string; settings?: Record<string, unknown>; headerImageUrl?: string; headerImageWidthPx?: number }) {
  const { member, session } = useAuth();
  const isAdmin = !!member?.is_admin;
  const triedPalette = useRef(new Set<string>());
  const [local, setDoors] = useState<LobbyDoor[] | null>(null); // 방금 올린 사진을 저장 응답 전에 바로 보여주기 위한 로컬 사본
  const doors = local ?? doorsProp;
  // EPIC-166: 관리자가 이 페이지를 볼 때 팔레트가 없는(또는 사진이 바뀐) 문의 색을 서버에서 뽑아 위젯 설정에 저장한다 — 방문자는 저장된 값만 읽는다.
  useEffect(() => {
    if (!isAdmin || !session?.access_token || !moduleId) return;
    const need = doors.filter((d) => d.imageUrl && d.paletteSrc !== d.imageUrl && !triedPalette.current.has(d.imageUrl));
    if (need.length === 0) return;
    need.forEach((d) => triedPalette.current.add(d.imageUrl));
    (async () => {
      try {
        const res = await fetch("/api/admin/door-palette", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ urls: need.map((d) => d.imageUrl) }) });
        if (!res.ok) return;
        const { palettes } = (await res.json()) as { palettes: Record<string, string[] | null> };
        const next = doors.map((d) => (palettes[d.imageUrl] ? { ...d, palette: palettes[d.imageUrl] as string[], paletteSrc: d.imageUrl } : d));
        setDoors(next);
        await supabase.from("page_modules").update({ settings: { ...(settings ?? {}), doors: next } }).eq("id", moduleId);
      } catch {
        /* 팔레트는 장식 — 실패하면 지정한 빛 색을 그대로 쓴다 */
      }
    })();
  }, [isAdmin, session?.access_token, moduleId, doors, settings]);
  // HOTFIX-167.5(사용자 지시 — "'사일로의 문을 열어보세요' 위에 이미지 하나를 중앙에"): 제목 위 중앙 이미지. 관리자는 그 자리(또는 안내 칸)에서 바로 올리고 지울 수 있다.
  const [headerLocal, setHeaderLocal] = useState<string | null>(null);
  const headerUrl = headerLocal ?? headerImageUrl ?? "";
  const [headerBusy, setHeaderBusy] = useState(false);
  async function saveHeaderImage(file: File | undefined, clear = false) {
    if (!clear && !file) return;
    setHeaderBusy(true);
    setUploadError(null);
    let url = "";
    if (!clear && file) {
      const up = await uploadFileToR2(file);
      if (up.error || !up.url) {
        setHeaderBusy(false);
        setUploadError(`업로드하지 못했어요: ${up.error ?? "알 수 없는 오류"}`);
        return;
      }
      url = up.url;
    }
    setHeaderLocal(url);
    if (moduleId) {
      const { error: saveError } = await supabase.from("page_modules").update({ settings: { ...(settings ?? {}), headerImageUrl: url } }).eq("id", moduleId);
      if (saveError) setUploadError(`저장하지 못했어요: ${saveError.message}`);
    }
    setHeaderBusy(false);
  }
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 관리자: 문 위의 "사진 올리기" — R2에 올리고 이 위젯의 설정(page_modules.settings.doors[i].imageUrl)에 바로 저장한다.
  async function uploadDoorImage(i: number, file: File | undefined) {
    if (!file) return;
    setBusyIdx(i);
    setUploadError(null);
    const { url, error } = await uploadFileToR2(file);
    if (error || !url) {
      setBusyIdx(null);
      setUploadError(`업로드하지 못했어요: ${error ?? "알 수 없는 오류"}`);
      return;
    }
    const next = doors.map((d, k) => (k === i ? { ...d, imageUrl: url } : d));
    setDoors(next);
    if (moduleId) {
      const { error: saveError } = await supabase.from("page_modules").update({ settings: { ...(settings ?? {}), doors: next } }).eq("id", moduleId);
      if (saveError) setUploadError(`사진은 올렸지만 저장하지 못했어요: ${saveError.message}`);
    }
    setBusyIdx(null);
  }
  const [active, setActive] = useState<{ door: LobbyDoor; rect: DOMRect } | null>(null);
  const [mounted, setMounted] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);

  // HOTFIX-165.4(사용자 지시 — "스크롤바 말고 좌우 드래그 앤 드롭 또는 버튼으로 넘기게"): 스크롤바는 숨기고 ① 마우스로 끌어서 ② 좌우 화살표 버튼으로 문을 넘긴다(터치는 기본 스와이프).
  // 끌었다면(5px 이상 이동) 그 뒤에 오는 클릭은 문 열기로 처리하지 않는다.
  const [edge, setEdge] = useState({ left: false, right: false });
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });
  const updateEdge = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    updateEdge();
    const el = rowRef.current;
    el?.addEventListener("scroll", updateEdge, { passive: true });
    window.addEventListener("resize", updateEdge);
    return () => {
      el?.removeEventListener("scroll", updateEdge);
      window.removeEventListener("resize", updateEdge);
    };
  }, [updateEdge, doors.length]);
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
    const move = (ev: PointerEvent) => {
      if (!drag.current.down) return;
      const dx = ev.clientX - drag.current.startX;
      if (Math.abs(dx) > 5) {
        drag.current.moved = true;
        el.style.scrollSnapType = "none";
        el.style.cursor = "grabbing";
      }
      if (drag.current.moved) el.scrollLeft = drag.current.startLeft - dx;
    };
    const up = () => {
      drag.current.down = false;
      el.style.scrollSnapType = "";
      el.style.cursor = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.setTimeout(() => {
        drag.current.moved = false;
      }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const nudge = (dir: 1 | -1) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: "smooth" });
  };
  const close = useCallback(() => setActive(null), []);
  if (doors.length === 0) return null;

  return (
    <section className="relative mb-12 py-6" aria-label={heading || "사일로의 문"}>
      {(headerUrl || isAdmin) && (
        <div className="mb-3 flex flex-col items-center gap-1.5">
          {headerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={headerUrl} alt="" draggable={false} style={{ width: Math.min(900, Math.max(40, headerImageWidthPx ?? 160)), maxWidth: "100%", height: "auto" }} />
          ) : (
            <div className="rounded border border-dashed border-gray-300 px-6 py-3 text-xs text-gray-400">제목 위에 들어갈 이미지 자리 (관리자에게만 보여요)</div>
          )}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white hover:bg-black/85">
                {headerBusy ? "올리는 중..." : headerUrl ? "📷 상단 이미지 바꾸기" : "📷 상단 이미지 올리기"}
                <input type="file" accept="image/*" className="hidden" disabled={headerBusy} onChange={(e) => { saveHeaderImage(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {headerUrl && (
                <button type="button" onClick={() => saveHeaderImage(undefined, true)} disabled={headerBusy} className="text-[11px] text-red-600">
                  지우기
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {(heading || subtitle) && (
        <div className="mb-6 text-center">
          {heading && <h2 className="whitespace-pre-line break-keep text-xl font-semibold text-gray-900">{heading}</h2>}
          {subtitle && <p className="mt-1 whitespace-pre-line break-keep text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      {/* HOTFIX-165.3(사용자 신고 — "About Silo 문이 왜 없어?"): justify-center는 넘치는 줄의 왼쪽 끝을 화면 밖으로 밀어 스크롤로도 못 닿게 만든다 → 첫/마지막 문에 auto 마진을 줘서 '안 넘칠 땐 가운데, 넘칠 땐 왼쪽부터' 정렬한다. */}
      <div
        ref={rowRef}
        onPointerDown={startDrag}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        className="-mx-6 flex cursor-grab select-none snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden px-6 pb-8 pt-4 [&>:first-child]:ml-auto [&>:last-child]:mr-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {doors.map((d, i) => (
          <div key={`${d.title}-${i}`} className="relative shrink-0 snap-center">
          <motion.button
            type="button"
            onClick={(e) => setActive({ door: d, rect: ((e.currentTarget as HTMLElement).querySelector("[data-door-box]") as HTMLElement).getBoundingClientRect() })}
            aria-label={`${d.title} 문 열기`}
            className="group relative flex w-[42vw] max-w-[190px] shrink-0 snap-center flex-col outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-[150px]"
            whileHover={{ y: -6 }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }}
          >
            <span data-door-box className={`relative block aspect-[3/5] w-full overflow-hidden ${d.imageUrl ? "" : "rounded-lg"}`} style={d.imageUrl ? undefined : { boxShadow: `0 0 0 1px ${d.accent}55` }}>
              <DoorFace door={d} admin={isAdmin} />
            </span>
            <span className="mt-2 block px-1 text-center">
              <span className="block break-keep text-sm font-semibold text-gray-900" style={{ fontFamily: SERIF }}>
                {d.title}
              </span>
              <span className="mt-0.5 block break-keep text-[11px] leading-tight text-gray-500">{d.tagline}</span>
            </span>
          </motion.button>
          {isAdmin && (
            <label className="absolute left-1.5 top-1.5 z-10 cursor-pointer rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white shadow hover:bg-black/85">
              {busyIdx === i ? "올리는 중..." : d.imageUrl ? "📷 사진 바꾸기" : "📷 문 사진 올리기"}
              <input type="file" accept="image/*" className="hidden" disabled={busyIdx !== null} onChange={(e) => { uploadDoorImage(i, e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          )}
          </div>
        ))}
      </div>
      {edge.left && (
        <button type="button" onClick={() => nudge(-1)} aria-label="이전 문들" className="absolute left-0 top-[52%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white/90 text-xl text-gray-700 shadow-lg backdrop-blur hover:bg-white">
          ‹
        </button>
      )}
      {edge.right && (
        <button type="button" onClick={() => nudge(1)} aria-label="다음 문들" className="absolute right-0 top-[52%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white/90 text-xl text-gray-700 shadow-lg backdrop-blur hover:bg-white">
          ›
        </button>
      )}
      {uploadError && <p className="mt-1 text-center text-sm font-medium text-red-600">{uploadError}</p>}
      {isAdmin && <p className="text-center text-[11px] text-gray-400">관리자에게만 보여요 — 각 문 왼쪽 위 버튼으로 앤틱 문 사진을 올리면 바로 저장돼요. 문 이름·설명은 페이지 수정의 이 위젯 설정에서 고쳐요.</p>}
      {mounted && <AnimatePresence>{active && <LobbyOverlay key={active.door.title} door={active.door} from={active.rect} onClose={close} />}</AnimatePresence>}
    </section>
  );
}
