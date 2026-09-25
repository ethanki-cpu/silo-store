"use client";

import { createContext, useContext } from "react";

// HOTFIX-163.3: 관리자 "페이지 수정" 미리보기(includeHidden)에서 렌더링 중인지 알려준다. 미리보기 안에서는 화면 전체를 덮는
// fixed 배경/고정(pinned) 연출이 관리자 화면 전체를 뿌옇게 덮어 버리므로, 각 위젯이 자기 영역 안에서만 그리도록 분기한다.
export const WidgetPreviewContext = createContext(false);
export const useWidgetPreview = () => useContext(WidgetPreviewContext);
