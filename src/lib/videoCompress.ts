"use client";

// 사용자 지시(2026-08-29 — "50mb 이상의 영상이 업로드 되면, 30mb 아래로
// 변환해서 업로드되도록 만들어줘, 모든 타임라인 게시판에 적용해"): Supabase
// Storage 무료 플랜은 50MB 고정 상한이라(HOTFIX-144.5 참고, src/lib/r2Upload.ts)
// 그보다 큰 영상은 업로드 자체가 실패한다. 이 프로젝트엔 서버 쪽 영상
// 트랜스코딩 인프라가 없어(ffmpeg 미설치, Vercel 서버리스) 브라우저에서
// ffmpeg.wasm(@ffmpeg/ffmpeg, 싱글스레드 코어 — COOP/COEP 헤더 불필요)으로
// 직접 재인코딩한다. 코어 wasm/js는 CDN 의존 없이 public/vendor/ffmpeg/에
// 로컬로 내려받아 둔다(public/vendor/timelinejs와 동일한 관례).
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const TARGET_BYTES = 30 * 1024 * 1024;
const AUDIO_BITRATE_KBPS = 96;
const CORE_BASE_PATH = "/vendor/ffmpeg";

let ffmpegPromise: Promise<FFmpeg> | null = null;
let currentLogHandler: ((message: string) => void) | null = null;
let currentProgressHandler: ((ratio: number) => void) | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => currentLogHandler?.(message));
      ffmpeg.on("progress", ({ progress }) => currentProgressHandler?.(progress));
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE_PATH}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE_PATH}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration || 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상 길이를 읽을 수 없습니다"));
    };
    video.src = url;
  });
}

/**
 * 50MB를 넘는 영상 파일을 30MB 아래로 재인코딩한다. 50MB 이하거나
 * 동영상이 아니면 원본을 그대로 반환한다(불필요한 재인코딩 방지).
 * onProgress는 사람이 읽을 수 있는 상태 문구를 순차적으로 전달한다.
 */
export async function compressVideoIfNeeded(
  file: File,
  onProgress?: (status: string) => void,
): Promise<File> {
  if (!file.type.startsWith("video/") || file.size <= MAX_UNCOMPRESSED_BYTES) return file;

  onProgress?.("영상 길이 확인 중...");
  const durationSeconds = await readVideoDurationSeconds(file);
  if (!durationSeconds || !Number.isFinite(durationSeconds)) {
    throw new Error("영상 길이를 확인할 수 없어 압축할 수 없습니다");
  }

  onProgress?.("압축 엔진 로딩 중... (처음 한 번만, 수십 MB)");
  const ffmpeg = await getFFmpeg();

  // 목표 용량(30MB)을 영상 길이로 나눠 총 비트레이트를 역산하고, 오디오
  // 몫을 뺀 나머지를 비디오 비트레이트로 쓴다. 컨테이너 오버헤드 대비
  // 8% 여유를 둔다.
  const targetTotalKbps = (TARGET_BYTES * 8) / 1000 / durationSeconds;
  const videoKbps = Math.max(300, Math.floor(targetTotalKbps * 0.92 - AUDIO_BITRATE_KBPS));

  const inputName = "input" + (file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? ".mp4");
  const outputName = "output.mp4";

  currentLogHandler = (message) => {
    if (/error/i.test(message)) onProgress?.(`(ffmpeg) ${message}`);
  };
  currentProgressHandler = (ratio) => {
    const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    onProgress?.(`영상 압축 중... ${pct}%`);
  };

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    const exitCode = await ffmpeg.exec([
      "-i", inputName,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-b:v", `${videoKbps}k`,
      "-maxrate", `${Math.round(videoKbps * 1.2)}k`,
      "-bufsize", `${Math.round(videoKbps * 2)}k`,
      "-c:a", "aac",
      "-b:a", `${AUDIO_BITRATE_KBPS}k`,
      "-movflags", "+faststart",
      outputName,
    ]);
    if (exitCode !== 0) throw new Error(`영상 압축 실패 (ffmpeg 종료 코드 ${exitCode})`);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data as BlobPart], { type: "video/mp4" });
    const newName = file.name.replace(/\.[^.]+$/, "") + "-compressed.mp4";
    onProgress?.(`압축 완료 (${(blob.size / 1024 / 1024).toFixed(1)}MB)`);
    return new File([blob], newName, { type: "video/mp4" });
  } finally {
    currentLogHandler = null;
    currentProgressHandler = null;
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
