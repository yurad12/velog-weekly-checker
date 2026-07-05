# 📝 Velog 스터디 벌금 정산 대시보드

매주 월요일 02:00(KST) 기준으로 멤버별 Velog 글 작성 현황과 벌금을 실시간 계산해 보여주는 웹 대시보드입니다.

- 별도 서버/DB 없음 — 접속할 때마다 Velog API에서 글 목록을 가져와 계산 (5분 캐시)
- 정산 시작일 이후 전체 누적 벌금 + 멤버별 누적 벌금 표시
- 주차별 정산 내역 테이블 제공

## 설정 변경

`lib/config.ts` 파일만 수정하면 됩니다.

- `RESET_DATE`: 벌금 정산 시작일 (초기화하려면 이 날짜를 바꾸고 재배포)
- `USERNAMES`: 멤버 velog 아이디
- `REQUIRED_COUNT`, `FINE_PER_MISSING`, `FINE_ALL_MISSING`: 벌금 규칙

## 로컬 실행

```bash
cd web
npm install
npm run dev   # http://localhost:3000
```

## Vercel 배포 (무료)

1. GitHub에 push
2. [vercel.com](https://vercel.com) → Add New Project → 이 저장소 선택
3. **Root Directory를 `web`으로 설정** (저장소 루트가 Gradle 프로젝트이므로 필수)
4. Deploy — 이후 push할 때마다 자동 재배포

## 참고

- 데이터는 페이지 접속 시 서버(Vercel Function)에서 계산되며 5분간 캐시됩니다 (`app/page.tsx`의 `revalidate` 값으로 조정 가능).
- 기존 Mattermost 웹훅 + GitHub Actions 방식은 이 대시보드로 대체되었습니다.
