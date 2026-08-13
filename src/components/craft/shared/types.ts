// EPIC-099(항목 3, Phase 2): "+ 섹션 추가" 목록의 항목 하나 — buildElement()가
// 그 블록의 "새 인스턴스"를 만든다. CraftPageEditor.tsx/Toolbox.tsx가 공유하는
// 타입이라 순환 import를 피하기 위해 별도 파일로 분리한다(EPIC-102).
import type { ReactElement } from "react";

export type CraftBlockOption = { label: string; buildElement: () => ReactElement };
