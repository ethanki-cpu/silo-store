// EPIC-160: 멤버십 등급별로 "접근 가능한 게시판"과 "이용 가능한 활동/혜택"을 사람이 읽는 문장으로 만든다.
// 값은 전부 membership_tiers 플래그(실제 게이팅에 쓰이는 값)에서 파생하므로 화면 안내와 실제 권한이 어긋나지 않는다
// (serverAuth.canReadBoard/canWriteToBoard, /api/salon-checkins, /api/reservations, /api/docent-purchases, /api/orders 참고).

export type TierRow = {
  rank: number;
  name: string;
  price: number;
  is_lifetime?: boolean | null;
  shop_purchase_discount_pct?: number | null;
  shop_rental_discount_pct?: number | null;
  curation_level?: number | null;
  club_all_free?: boolean | null;
  club_monthly_free_sessions?: number | null;
  club_participation_discount_pct?: number | null;
  club_priority_booking?: boolean | null;
  monthly_salon_meeting_invite?: boolean | null;
  secret_room_access?: string | null;
  docent_free_only?: boolean | null;
  docent_per_item_discount_pct?: number | null;
  docent_monthly_free_count?: number | null;
  drink_free?: boolean | null;
  tour_docent_free?: boolean | null;
  salon_entry_free?: boolean | null;
  salon_entry_hourly_fee?: number | null;
  board_write_scope?: string | null;
  board_can_write_docent?: boolean | null;
  board_can_create?: boolean | null;
  board_has_patron_board?: boolean | null;
};

export type TierAccess = {
  /** 접근·이용할 수 있는 게시판 */
  boards: string[];
  /** 이용할 수 있는 활동(클럽/살롱/도슨트 등) */
  activities: string[];
  /** 상점·도슨트 할인과 열람 혜택 */
  perks: string[];
};

export function describeTierAccess(t: TierRow): TierAccess {
  const boards: string[] = ["공개 게시판 전체 열람"];
  boards.push(
    t.board_write_scope === "all"
      ? "모든 게시판 글쓰기(요일별 클럽 모임방 포함)"
      : "자유·주제별 게시판 글쓰기(요일별 클럽 모임방은 유료 등급부터)",
  );
  if (t.board_can_write_docent) boards.push("도슨트 글쓰기");
  if (t.board_has_patron_board) boards.push("패트론 라운지(전용 게시판) 열람·글쓰기");
  if (t.board_can_create) boards.push("게시판 개설");

  const activities: string[] = [];
  if (t.club_all_free) activities.push("요일별 클럽 모임 전체 무료 참여");
  else {
    if (t.club_monthly_free_sessions) activities.push(`클럽 모임 월 ${t.club_monthly_free_sessions}회 무료`);
    if (t.club_participation_discount_pct) activities.push(`클럽 모임 참여비 ${t.club_participation_discount_pct}% 할인`);
    if (!t.club_monthly_free_sessions && !t.club_participation_discount_pct) activities.push("클럽 모임 참여(정가)");
  }
  if (t.club_priority_booking) activities.push("클럽 우선 예약");
  if (t.salon_entry_free) activities.push("살롱 입장 무료");
  else if (t.salon_entry_hourly_fee) activities.push(`살롱 입장 시간당 ${t.salon_entry_hourly_fee.toLocaleString("ko-KR")}원`);
  if (t.drink_free) activities.push("살롱 음료 무료");
  if (t.tour_docent_free) activities.push("투어 도슨트 무료");
  if (t.monthly_salon_meeting_invite) activities.push("월별 살롱 모임(패트론의 살롱) 초대");
  if (t.secret_room_access && t.secret_room_access !== "none") activities.push("비밀의 방 도슨트 신청 자격(심사 후)");

  const perks: string[] = [];
  if (t.docent_free_only) perks.push("온라인 도슨트: 무료 콘텐츠만 열람");
  if (t.docent_monthly_free_count) perks.push(`온라인 도슨트 월 ${t.docent_monthly_free_count}건 무료`);
  if (t.docent_per_item_discount_pct) perks.push(`온라인 도슨트 ${t.docent_per_item_discount_pct}% 할인`);
  if (t.shop_purchase_discount_pct) perks.push(`사일로 상점 구매 ${t.shop_purchase_discount_pct}% 할인`);
  if (t.shop_rental_discount_pct) perks.push(`사일로 상점 대여 ${t.shop_rental_discount_pct}% 할인`);
  if (t.curation_level) perks.push(`상품 큐레이션 ${t.curation_level}단계 열람`);

  return { boards, activities, perks };
}
