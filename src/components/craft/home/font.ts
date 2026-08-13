// EPIC-098: 홈페이지 Craft 렌더러/에디터 전용 세리프 폰트 — globals.css의
// `.craft-home .font-serif` override가 참조하는 CSS 변수를 여기서 생성한다.
import { EB_Garamond } from "next/font/google";

export const editorialSerif = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-editorial-serif",
  display: "swap",
});
