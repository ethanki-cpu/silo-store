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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={door.imageUrl} alt={door.title} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.05) 40%, rgba(0,0,0,.78) 100%)" }} />
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
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ width: W, height: H, marginLeft: -W / 2, marginTop: -H / 2, perspective: 1300 }}
        initial={reduce ? false : { x: startX, y: startY, scale: from.width / W }}
        animate={{ x: 0, y: 0, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.95, ease: EASE }}
      >
        {/* 문 뒤편의 방 — 설명 캐러셀 */}
        <div className="absolute inset-0 flex flex-col overflow-hidden px-6 pb-5 pt-9 text-center text-white" style={{ borderRadius: "10px", background: `radial-gradient(ellipse at 10% 50%, ${a}dd 0%, ${a}55 30%, #14101c 74%)`, boxShadow: `0 0 120px ${a}66, inset 0 0 60px ${a}33` }}>
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
        </div>

        {/* 문짝: 왼쪽 경첩을 축으로 열린다 */}
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ borderRadius: "10px", transformOrigin: "left center", backfaceVisibility: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}
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
          style={{ background: a, boxShadow: `0 0 30px 14px ${a}, 0 0 110px 44px ${a}88`, backdropFilter: "blur(10px) brightness(1.6)", WebkitBackdropFilter: "blur(10px) brightness(1.6)" }}
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

export function DoorLobby({ heading, subtitle, doors: doorsProp, moduleId, settings }: { heading: string; subtitle: string; doors: LobbyDoor[]; moduleId?: string; settings?: Record<string, unknown> }) {
  const { member } = useAuth();
  const isAdmin = !!member?.is_admin;
  const [local, setDoors] = useState<LobbyDoor[] | null>(null); // 방금 올린 사진을 저장 응답 전에 바로 보여주기 위한 로컬 사본
  const doors = local ?? doorsProp;
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
  const close = useCallback(() => setActive(null), []);
  if (doors.length === 0) return null;

  return (
    <section className="relative mb-12 py-6" aria-label={heading || "사일로의 문"}>
      {(heading || subtitle) && (
        <div className="mb-6 text-center">
          {heading && <h2 className="text-xl font-semibold text-gray-900">{heading}</h2>}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      <div ref={rowRef} className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-5 pt-2 sm:justify-center" style={{ scrollbarWidth: "thin" }}>
        {doors.map((d, i) => (
          <div key={`${d.title}-${i}`} className="relative shrink-0 snap-center">
          <motion.button
            type="button"
            onClick={(e) => setActive({ door: d, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
            aria-label={`${d.title} 문 열기`}
            className="group relative aspect-[3/5] w-[42vw] max-w-[190px] shrink-0 snap-center overflow-hidden rounded-lg text-white outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-[150px]"
            style={{ boxShadow: `0 10px 28px rgba(0,0,0,.35), 0 0 0 1px ${d.accent}55` }}
            whileHover={{ y: -6, boxShadow: `0 16px 38px rgba(0,0,0,.45), 0 0 34px ${d.accent}66` }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }}
          >
            <DoorFace door={d} admin={isAdmin} />
            <span className="absolute inset-x-0 bottom-0 px-2 pb-3 pt-8 text-center" style={{ background: d.imageUrl ? undefined : "linear-gradient(180deg, transparent, rgba(0,0,0,.7))" }}>
              <span className="block break-keep text-sm font-semibold drop-shadow" style={{ fontFamily: SERIF }}>
                {d.title}
              </span>
              <span className="mt-0.5 block break-keep text-[10px] leading-tight text-white/75">{d.tagline}</span>
            </span>
            <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white/80 opacity-0 transition-opacity group-hover:opacity-100">열기</span>
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
      {uploadError && <p className="mt-1 text-center text-sm font-medium text-red-600">{uploadError}</p>}
      {isAdmin && <p className="text-center text-[11px] text-gray-400">관리자에게만 보여요 — 각 문 왼쪽 위 버튼으로 앤틱 문 사진을 올리면 바로 저장돼요. 문 이름·설명은 페이지 수정의 이 위젯 설정에서 고쳐요.</p>}
      {mounted && <AnimatePresence>{active && <LobbyOverlay key={active.door.title} door={active.door} from={active.rect} onClose={close} />}</AnimatePresence>}
    </section>
  );
}
