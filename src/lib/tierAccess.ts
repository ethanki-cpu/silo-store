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
  docent_flat_price?: number | null;
  docent_daily_free_count?: number | null;
  drink_free?: boolean | null;
  tour_docent_free?: boolean | null;
  salon_entry_free?: boolean | null;
  salon_entry_hourly_fee?: number | null;
  board_write_scope?: string | null;
  board_can_write_docent?: boolean | null;
  board_can_create?: boolean | null;
  board_has_patron_board?: boolean | null;
  // HOTFIX-161.7: 등급 카드 대표 사진(/membership, /pricing).
  image_url?: string | null;
};

export type TierAccess = {
  /** 접근·이용할 수 있는 게시판 — HOTFIX-161.7: describeTierAccess는 더 이상 이 필드를 채우지
   * 않는다(빈 배열) — 호출부가 describeBoardHighlightsForTier()의 결과로 덮어써서 채운다. */
  boards: string[];
  /** 이용할 수 있는 활동(클럽/살롱/도슨트 등) */
  activities: string[];
  /** 상점·도슨트 할인과 열람 혜택 */
  perks: string[];
};

// HOTFIX-161.7(사용자 신고 — "각 멤버십마다 어떤 게시판의 게시글 열람가능하게
// 했는지, 어떤 멤버십이 좋아요/댓글/북마크/뱃지/게시글 관리 또는 수정 또는
// 쓰기 제안을 하나하나 다 정했는데, 지금 표시된게 너무 적어"): 예전엔 위
// describeTierAccess가 "공개 게시판 전체 열람"/"모든 게시판 글쓰기" 같은
// 뭉뚱그린 문장을 하드코딩해 보여줬는데, 실제로 관리자가 게시판마다
// 세밀하게 설정한 값(/admin/board-permissions의 boards.min_rank_to_*
// 6개 + badge_min_rank)과 전혀 연결돼 있지 않아 부정확했다 — 이제 그
// 실제 게시판별 설정을 그대로 읽어 등급별로 "이 게시판에서 뭘 할 수
// 있는지"를 하나하나 나열한다(같은 이유로 화면 안내와 실제 권한이
// 어긋나지 않는다는 이 프로젝트의 설계 원칙을 그대로 따름).
export type BoardPermissionRow = {
  name: string;
  min_rank_to_read: number | null;
  min_rank_to_view_post: number | null;
  min_rank_to_comment: number | null;
  min_rank_to_like: number | null;
  min_rank_to_bookmark: number | null;
  min_rank_to_write: number | null;
  min_rank_to_propose: number | null;
  badge_min_rank: number | null;
};

const BOARD_CAP_LABELS: [key: keyof BoardPermissionRow, label: string][] = [
  ["min_rank_to_read", "열람"],
  ["min_rank_to_view_post", "게시글열람"],
  ["min_rank_to_comment", "댓글"],
  ["min_rank_to_like", "좋아요"],
  ["min_rank_to_bookmark", "북마크"],
  ["min_rank_to_write", "글쓰기"],
  ["min_rank_to_propose", "제안"],
];

function boardCapGranted(minRank: number | null, tierRank: number): boolean {
  return minRank == null || tierRank >= minRank;
}

// 게시판마다 "이 등급에서 가능한 것"을 나열한다. 어떤 등급 게이트도 없는
// 게시판(전부 null — 사실상 전 등급 공통 공개 게시판)은 등급을 구분해
// 보여줄 의미가 없어 하이라이트에서 제외한다. 이 등급에서 아무 권한도
// 없는(전부 막힌) 게시판도 "안 됨"만 나열하면 오히려 광고 효과가 없어
// 제외한다 — 결과는 "이 등급이 실제로 뭘 할 수 있는지"만 보여준다.
export function describeBoardHighlightsForTier(boards: BoardPermissionRow[], tierRank: number): string[] {
  const lines: string[] = [];
  for (const b of boards) {
    const isGated = BOARD_CAP_LABELS.some(([key]) => b[key] != null) || b.badge_min_rank != null;
    if (!isGated) continue;
    const granted = BOARD_CAP_LABELS.filter(([key]) => boardCapGranted(b[key] as number | null, tierRank)).map(
      ([, label]) => label,
    );
    if (b.badge_min_rank != null && tierRank >= b.badge_min_rank) granted.push("뱃지");
    if (granted.length === 0) continue;
    lines.push(`${b.name}: ${granted.join("·")}`);
  }
  return lines.sort((a, b) => a.localeCompare(b, "ko"));
}

export function describeTierAccess(t: TierRow): TierAccess {
  const boards: string[] = [];

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

  // HOTFIX-161.7: 콘텐츠 정가 기준 할인이 아니라 등급별 고정가 + 하루
  // 무료 건수 모델로 바뀌었다(docent-purchases route.ts 참고).
  const perks: string[] = [];
  if (t.docent_daily_free_count) perks.push(`온라인 도슨트 하루 ${t.docent_daily_free_count}건 무료, 이후 단품 ${(t.docent_flat_price ?? 0).toLocaleString("ko-KR")}원`);
  else if (t.docent_flat_price != null) perks.push(`온라인 도슨트 단품 ${t.docent_flat_price.toLocaleString("ko-KR")}원`);
  if (t.shop_purchase_discount_pct) perks.push(`사일로 상점 구매 ${t.shop_purchase_discount_pct}% 할인`);
  if (t.shop_rental_discount_pct) perks.push(`사일로 상점 대여 ${t.shop_rental_discount_pct}% 할인`);
  if (t.curation_level) perks.push(`상품 큐레이션 ${t.curation_level}단계 열람`);

  return { boards, activities, perks };
}
