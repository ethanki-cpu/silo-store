"use client";

// HOTFIX-147.7(사용자 지시 — 모바일 전용 드래그 위치 편집): CraftPageEditor의
// "PC 모드/모바일 모드" 토글은 지금까지 캔버스 폭만 바꿨을 뿐, 그 아래
// 블록들이 "지금 관리자가 어느 모드를 보고 있는지"를 알 방법이 없었다 —
// FreePositionHandles/FreePositionSettingsSection이 이 값을 읽어 드래그
// 결과를 position(PC)과 mobilePosition(모바일) 중 어디에 쓸지 정한다.
// 공개 페이지(CraftPageRenderer)에는 이 Provider가 없어 기본값 "pc"로
// 폴백되는데, 공개 페이지는 애초에 편집 UI 자체가 안 보이므로(useCraftEditable
// 가드) 이 폴백값이 실제로 쓰일 일은 없다.
import { createContext, useContext } from "react";

export type DeviceMode = "pc" | "mobile";

const DeviceModeContext = createContext<DeviceMode>("pc");

export function DeviceModeProvider({ mode, children }: { mode: DeviceMode; children: React.ReactNode }) {
  return <DeviceModeContext.Provider value={mode}>{children}</DeviceModeContext.Provider>;
}

export function useDeviceMode(): DeviceMode {
  return useContext(DeviceModeContext);
}
