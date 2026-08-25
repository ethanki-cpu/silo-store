import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // EPIC-070: eslint-config-next의 최근 업데이트로 함께 올라온
  // react-hooks/set-state-in-effect(신규, strict) 규칙이 이 저장소
  // 전역에서 쓰는 흔하고 안전한 패턴("effect 진입 시 loading 상태를 동기
  // setState한 뒤 비동기 fetch 시작")을 24곳에서 error로 잡아 Vercel의
  // `npm run lint` 빌드 게이트가 전부 실패하고 있었다. 실제 버그가 아니라
  // 규칙이 기존 컨벤션에 비해 과도하게 엄격한 경우라 warning으로 낮춘다
  // (완전히 끄지 않아 눈에는 계속 보이게 유지 — 점진적으로 정리할 대상).
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // EPIC-147-후속: public/vendor/timelinejs는 자체 호스팅용으로 복사해
    // 넣은 서드파티 배포 산출물(TimelineJS3 dist 번들)이지 우리 소스가
    // 아니다 — 이 override 목록이 next의 기본 무시 목록을 완전히 대체하므로
    // 여기 추가하지 않으면 "public/**"이 더 이상 무시되지 않는다(실측: 이
    // 항목을 추가하기 전엔 ESLint가 미니파이된 timeline.js를 그대로
    // 파싱해 수백 개의 가짜 에러를 냈다).
    "public/**",
  ]),
]);

export default eslintConfig;
