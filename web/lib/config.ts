// ─── 스터디 설정 ───────────────────────────────────────────────
// 필요 시 이 파일만 수정하면 됩니다.

/** 벌금 정산 시작일 (KST, YYYY-MM-DD). 이 날짜가 속한 주의 월요일 02:00부터 정산합니다. */
export const RESET_DATE = "2026-07-06";

/** 스터디 멤버 velog 아이디 */
export const USERNAMES = [
  "jjungyu12",
  "brightrain453",
  "junch-lee",
  "dutjddnr1224",
] as const;

/** 주당 목표 글 개수 */
export const REQUIRED_COUNT = 3;

/** 미달 1개당 벌금 (원) */
export const FINE_PER_MISSING = 3000;

/** 한 개도 안 썼을 때 벌금 (원) */
export const FINE_ALL_MISSING = 10000;
