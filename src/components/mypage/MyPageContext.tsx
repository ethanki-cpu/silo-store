"use client";

import { createContext, useContext, type ReactNode } from "react";

type MyPageContextValue = {
  memberId: string;
};

const MyPageContext = createContext<MyPageContextValue | null>(null);

export function MyPageProvider({
  value,
  children,
}: {
  value: MyPageContextValue;
  children: ReactNode;
}) {
  return (
    <MyPageContext.Provider value={value}>{children}</MyPageContext.Provider>
  );
}

// EPIC-045: /mypage가 단일 페이지 탭 전환에서 하위 라우트 구조로 바뀌면서,
// 기존에 mypage/page.tsx 하나가 들고 있던 memberId를 layout.tsx가 조회해
// 이 컨텍스트로 각 하위 라우트 page.tsx에 전달한다.
export function useMyPageMember(): string {
  const ctx = useContext(MyPageContext);
  if (!ctx) {
    throw new Error("useMyPageMember must be used within MyPageProvider");
  }
  return ctx.memberId;
}
