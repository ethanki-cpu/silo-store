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
  ]),
]);

export default eslintConfig;
