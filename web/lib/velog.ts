import {
  RESET_DATE,
  USERNAMES,
  REQUIRED_COUNT,
  FINE_PER_MISSING,
  FINE_ALL_MISSING,
} from "./config";

const VELOG_URL = "https://v2.velog.io/graphql";
const KST_OFFSET = 9 * 3600_000;
const WEEK_MS = 7 * 86400_000;
const PAGE_SIZE = 50;

export interface Post {
  id: string;
  title: string;
  releasedAt: number; // UTC ms
  urlSlug: string;
}

export interface WeekResult {
  start: number; // UTC ms (월요일 02:00 KST)
  end: number;
  count: number;
  fine: number;
  posts: Post[];
}

export interface MemberStats {
  username: string;
  displayName: string;
  thumbnail: string | null;
  error?: string;
  totalFine: number;
  weeks: WeekResult[];
  currentWeek: WeekResult;
}

export interface Dashboard {
  generatedAt: number;
  settlementStart: number;
  currentWeekStart: number;
  currentWeekEnd: number;
  totalFine: number;
  members: MemberStats[];
}

/** ts가 속한 주의 월요일 02:00 KST(UTC ms). ts보다 이전 또는 같은 시각 */
function mondayStart(tsUtc: number): number {
  const kst = new Date(tsUtc + KST_OFFSET);
  const daysSinceMonday = (kst.getUTCDay() + 6) % 7;
  const monday =
    Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate() - daysSinceMonday,
      2, 0, 0
    ) - KST_OFFSET;
  return monday > tsUtc ? monday - WEEK_MS : monday;
}

/** 정산 시작 시각: RESET_DATE가 속한 주의 월요일 02:00 KST */
export function settlementStart(): number {
  const resetUtc = Date.parse(`${RESET_DATE}T00:00:00+09:00`);
  return mondayStart(resetUtc + 86400_000 - 1);
}

function calcFine(count: number): number {
  if (count >= REQUIRED_COUNT) return 0;
  const missing = REQUIRED_COUNT - count;
  return missing === REQUIRED_COUNT ? FINE_ALL_MISSING : missing * FINE_PER_MISSING;
}

async function fetchPostsSince(
  username: string,
  sinceUtc: number
): Promise<{ posts: Post[]; displayName: string; thumbnail: string | null }> {
  const query = `
    query Posts($username: String, $limit: Int, $cursor: ID) {
      posts(username: $username, limit: $limit, cursor: $cursor) {
        id
        title
        url_slug
        released_at
        user { profile { display_name, thumbnail } }
      }
    }`;

  const posts: Post[] = [];
  let displayName = username;
  let thumbnail: string | null = null;
  let cursor: string | undefined;

  for (let page = 0; page < 20; page++) {
    const res = await fetch(VELOG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { username, limit: PAGE_SIZE, cursor },
      }),
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Velog API HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(`Velog API: ${JSON.stringify(json.errors)}`);

    const batch: any[] = json?.data?.posts ?? [];
    if (batch.length === 0) break;

    const dn = batch[0]?.user?.profile?.display_name;
    if (dn) displayName = dn;
    const th = batch[0]?.user?.profile?.thumbnail;
    if (th) thumbnail = th;

    let reachedEnd = false;
    for (const p of batch) {
      const releasedAt = Date.parse(p.released_at);
      if (releasedAt < sinceUtc) {
        reachedEnd = true;
        break;
      }
      posts.push({
        id: p.id,
        title: p.title,
        releasedAt,
        urlSlug: p.url_slug ?? "",
      });
    }

    if (reachedEnd || batch.length < PAGE_SIZE) break;
    cursor = batch[batch.length - 1].id;
  }

  return { posts, displayName, thumbnail };
}

export async function buildDashboard(): Promise<Dashboard> {
  const now = Date.now();
  const start = settlementStart();
  const currentWeekStart = mondayStart(now);

  // 주 경계 목록 (정산 시작 ~ 현재)
  const weekStarts: number[] = [];
  for (let ws = start; ws <= currentWeekStart; ws += WEEK_MS) weekStarts.push(ws);

  const members: MemberStats[] = await Promise.all(
    USERNAMES.map(async (username): Promise<MemberStats> => {
      let posts: Post[] = [];
      let displayName: string = username;
      let thumbnail: string | null = null;
      let error: string | undefined;

      try {
        const r = await fetchPostsSince(username, start);
        posts = r.posts;
        displayName = r.displayName;
        thumbnail = r.thumbnail;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }

      const weeks: WeekResult[] = [];
      let currentWeek: WeekResult = {
        start: currentWeekStart,
        end: currentWeekStart + WEEK_MS,
        count: 0,
        fine: 0,
        posts: [],
      };
      let totalFine = 0;

      for (const ws of weekStarts) {
        const we = ws + WEEK_MS;
        const weekPosts = posts
          .filter((p) => p.releasedAt >= ws && p.releasedAt < we)
          .sort((a, b) => a.releasedAt - b.releasedAt);

        if (ws === currentWeekStart) {
          currentWeek = { start: ws, end: we, count: weekPosts.length, fine: 0, posts: weekPosts };
        } else {
          const fine = error ? 0 : calcFine(weekPosts.length);
          totalFine += fine;
          weeks.push({ start: ws, end: we, count: weekPosts.length, fine, posts: weekPosts });
        }
      }

      weeks.reverse(); // 최신순
      return { username, displayName, thumbnail, error, totalFine, weeks, currentWeek };
    })
  );

  return {
    generatedAt: now,
    settlementStart: start,
    currentWeekStart,
    currentWeekEnd: currentWeekStart + WEEK_MS,
    totalFine: members.reduce((s, m) => s + m.totalFine, 0),
    members,
  };
}

export function fmtDate(tsUtc: number): string {
  const d = new Date(tsUtc + KST_OFFSET);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

export function fmtDateTime(tsUtc: number): string {
  const d = new Date(tsUtc + KST_OFFSET);
  return `${fmtDate(tsUtc)} ${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes()
  ).padStart(2, "0")}`;
}

export function fmtWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}
