"use client";

// B2: 홈페이지 설정 관리의 4개 섹션(로고/사이드바 아이콘/상단 탭/계정
// 메뉴)을 위한 경량 Craft 에디터 셸 — 기존 CraftPageEditor.tsx를 그대로
// 쓰지 않는다: 그건 Toolbox(요소 추가)+page_builder.craft_state 저장
// 흐름을 전제하는데, 여기는 요소 추가가 없고(계획 결정 5 — 상단 탭은
// site_navigations에서 자동 생성, 로고/사이드바 아이콘/계정 메뉴는 항상
// 정해진 자리만 있음) 저장도 site_settings로 계속 나간다(계획 결정 2) —
// 그 두 전제가 안 맞아 <Editor>+<Frame>+재사용 SettingsSidebar만 조합한
// 최소 셸을 새로 만들었다.
//
// 트리 갱신에 대해: Craft.js의 <Frame>은 최초 마운트 시의 children만
// 읽고 이후 다시 읽지 않는다(공식 동작) — 그래서 이 컴포넌트를 부모가
// key로 감싸(예: PC/모바일 전환 시 key={chromeDeviceTab}) 완전히
// 리마운트해야 새 tree가 반영된다. 같은 세션 안에서 설정 패널로 값을
// 바꾸는 것(타이핑하며 실시간으로 보이는 것)은 Frame을 다시 읽는 게
// 아니라 각 블록이 자기 자신의 Craft setProp으로 스스로 다시 그리는
// 것이라 이 제약과 무관하게 항상 즉시 반영된다.
import { Editor, Frame } from "@craftjs/core";
import type { ReactNode } from "react";
import { SettingsSidebar } from "@/components/craft/shared/SettingsSidebar";
import { chromeResolver } from "@/components/craft/chrome/resolver";

export function ChromeCraftEditor({
  tree,
  deviceWidth,
}: {
  tree: ReactNode;
  /** 지정하면 캔버스를 그 폭(px)으로 좁혀 모바일 미리보기처럼 보이게 한다. */
  deviceWidth?: number;
}) {
  return (
    <Editor resolver={chromeResolver} enabled>
      <div className="flex h-[440px] w-full overflow-hidden rounded-lg border border-gray-200">
        <div className="min-w-0 flex-1 overflow-auto bg-gray-100 p-4">
          <div
            className={deviceWidth ? "mx-auto border-x border-gray-300 bg-white shadow-lg" : "bg-white"}
            style={deviceWidth ? { width: deviceWidth } : undefined}
          >
            <Frame>{tree}</Frame>
          </div>
        </div>
        <SettingsSidebar />
      </div>
    </Editor>
  );
}
