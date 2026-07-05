import {
  buildDashboard,
  fmtDate,
  fmtDateTime,
  fmtWon,
  type MemberStats,
} from "@/lib/velog";
import { REQUIRED_COUNT } from "@/lib/config";
import {
  AlertTriangleIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FlagIcon,
  PenLineIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";

export const revalidate = 300; // 5분마다 갱신

function StatusBadge({ m }: { m: MemberStats }) {
  const c = m.currentWeek.count;
  if (c >= REQUIRED_COUNT)
    return (
      <span className="badge ok">
        <CheckCircleIcon size={13} /> 달성
      </span>
    );
  if (c > 0)
    return (
      <span className="badge warn">
        <PenLineIcon size={13} /> {REQUIRED_COUNT - c}개 남음
      </span>
    );
  return (
    <span className="badge fail">
      <AlertTriangleIcon size={13} /> 미작성
    </span>
  );
}

function Avatar({ m }: { m: MemberStats }) {
  if (m.thumbnail)
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={m.thumbnail} alt={m.displayName} />;
  return <div className="avatar-fallback">{m.displayName.charAt(0).toUpperCase()}</div>;
}

export default async function Page() {
  const data = await buildDashboard();
  const errors = data.members.filter((m) => m.error);
  const weekList = data.members[0]?.weeks ?? [];
  const achievedNow = data.members.filter(
    (m) => m.currentWeek.count >= REQUIRED_COUNT
  ).length;

  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          <div className="nav-brand">
            <span className="nav-logo">
              <BookOpenIcon size={17} />
            </span>
            Velog 스터디 정산
          </div>
          <div className="nav-meta">
            <ClockIcon size={13} />
            {fmtDateTime(data.generatedAt)} 갱신
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="container">
          <div className="hero-label">
            <WalletIcon size={14} />
            전체 누적 벌금
          </div>
          <div className="hero-amount">
            {data.totalFine.toLocaleString("ko-KR")}
            <span className="unit">원</span>
          </div>
          <div className="hero-sub">
            <span>
              <FlagIcon size={13} /> 정산 시작 {fmtDate(data.settlementStart)}
            </span>
            <span>
              <PenLineIcon size={13} /> 주 {REQUIRED_COUNT}개 작성
            </span>
            <span>
              <WalletIcon size={13} /> 미달 1개당 3,000원 · 전부 미작성 시 10,000원
            </span>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="stats">
          <div className="stat-card">
            <div className="stat-icon blue">
              <CalendarIcon size={20} />
            </div>
            <div>
              <div className="stat-label">이번 주 체크 기간</div>
              <div className="stat-value" style={{ fontSize: 15 }}>
                {fmtDate(data.currentWeekStart)} ~ {fmtDate(data.currentWeekEnd - 1)}
                <small>월 02:00 마감</small>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon teal">
              <UsersIcon size={20} />
            </div>
            <div>
              <div className="stat-label">이번 주 목표 달성</div>
              <div className="stat-value">
                {achievedNow}
                <small>/ {data.members.length}명</small>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">
              <TrendingUpIcon size={20} />
            </div>
            <div>
              <div className="stat-label">정산 완료 주차</div>
              <div className="stat-value">
                {weekList.length}
                <small>주</small>
              </div>
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="error-box">
            <AlertTriangleIcon size={16} />
            일부 멤버 데이터를 불러오지 못했습니다:{" "}
            {errors.map((m) => m.username).join(", ")} — 해당 멤버는 집계에서 제외된
            상태입니다.
          </div>
        )}

        <section className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="ico">
                <PenLineIcon size={17} />
              </span>
              이번 주 현황
            </div>
            <div className="section-caption">
              {fmtDateTime(data.currentWeekStart)} ~ {fmtDateTime(data.currentWeekEnd)} (KST)
            </div>
          </div>

          <div className="member-grid">
            {data.members.map((m) => (
              <div className="member-card" key={m.username}>
                <div className="member-head">
                  <Avatar m={m} />
                  <div className="member-who">
                    <div className="member-name">
                      <a
                        href={`https://velog.io/@${m.username}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {m.displayName}
                      </a>
                      <span className="ico">
                        <ExternalLinkIcon size={12} />
                      </span>
                    </div>
                    <div className="member-id">@{m.username}</div>
                  </div>
                  <StatusBadge m={m} />
                </div>

                <div className="progress-row">
                  <span>이번 주 작성</span>
                  <b>
                    {m.currentWeek.count} / {REQUIRED_COUNT}
                  </b>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${m.currentWeek.count === 0 ? "zero" : ""}`}
                    style={{
                      width: `${Math.min(100, (m.currentWeek.count / REQUIRED_COUNT) * 100)}%`,
                    }}
                  />
                </div>

                <ul className="post-list">
                  {m.currentWeek.posts.map((p) => (
                    <li key={p.id}>
                      <span className="ico">
                        <FileTextIcon size={14} />
                      </span>
                      <a
                        href={`https://velog.io/@${m.username}/${p.urlSlug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {p.title}
                      </a>
                    </li>
                  ))}
                  {m.currentWeek.posts.length === 0 && (
                    <li className="post-empty">아직 작성된 글이 없어요</li>
                  )}
                </ul>

                <div className="member-fine">
                  <span>누적 벌금</span>
                  <span className={`amount ${m.totalFine === 0 ? "zero" : ""}`}>
                    {fmtWon(m.totalFine)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div className="section-title">
              <span className="ico">
                <CalendarIcon size={17} />
              </span>
              주차별 정산 내역
            </div>
            <div className="section-caption">매주 월요일 02:00 (KST) 확정</div>
          </div>

          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>기간</th>
                  {data.members.map((m) => (
                    <th key={m.username}>{m.displayName}</th>
                  ))}
                  <th>합계</th>
                </tr>
              </thead>
              <tbody>
                {weekList.length === 0 && (
                  <tr>
                    <td className="empty-row" colSpan={data.members.length + 2}>
                      아직 정산 완료된 주차가 없습니다. 첫 정산은{" "}
                      {fmtDate(data.currentWeekEnd)} 월요일 02:00에 확정됩니다.
                    </td>
                  </tr>
                )}
                {weekList.map((w, i) => {
                  const weekSum = data.members.reduce(
                    (s, m) => s + (m.weeks[i]?.fine ?? 0),
                    0
                  );
                  return (
                    <tr key={w.start}>
                      <td>
                        {fmtDate(w.start)} ~ {fmtDate(w.end - 1)}
                      </td>
                      {data.members.map((m) => {
                        const mw = m.weeks[i];
                        if (!mw || m.error) return <td key={m.username}>—</td>;
                        return (
                          <td key={m.username}>
                            {mw.fine === 0 ? (
                              <span className="cell-ok">
                                <CheckIcon size={13} />
                              </span>
                            ) : (
                              <span className="cell-fine">{fmtWon(mw.fine)}</span>
                            )}
                            <span className="cell-sub">
                              {mw.count}/{REQUIRED_COUNT}개
                            </span>
                          </td>
                        );
                      })}
                      <td>
                        {weekSum === 0 ? (
                          <span className="cell-zero">0원</span>
                        ) : (
                          <span className="cell-fine">{fmtWon(weekSum)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {weekList.length > 0 && (
                <tfoot>
                  <tr>
                    <td>누적 합계</td>
                    {data.members.map((m) => (
                      <td key={m.username}>
                        <span className={m.totalFine === 0 ? "cell-zero" : "cell-fine"}>
                          {fmtWon(m.totalFine)}
                        </span>
                      </td>
                    ))}
                    <td>
                      <span className={data.totalFine === 0 ? "cell-zero" : "cell-fine"}>
                        {fmtWon(data.totalFine)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <div className="footer">
          <ClockIcon size={12} />
          마지막 갱신 {fmtDateTime(data.generatedAt)} (KST) · 5분마다 자동 갱신 · 데이터 출처: Velog
        </div>
      </main>
    </>
  );
}
