# Velog Weekly Checker

스터디 멤버들의 Velog 주간 글 작성을 체크하고 벌금을 정산하는 대시보드입니다.

**규칙**<br>
· 매주 월요일 02:00(KST) 기준<br>
· 주 3개 작성<br>
· 미달 1개당 3,000원, 전부 미작성 시 10,000원

## 동작 방식

별도 서버/DB 없이, 접속할 때마다 Velog API에서 정산 시작일 이후의 글을 가져와 주차별 벌금과 멤버별 누적 벌금을 실시간으로 계산합니다. (5분 캐시)

## 프로젝트 구조

```
web/                  # Next.js 대시보드 (Vercel 배포)
 ├─ lib/config.ts     # 정산 시작일, 멤버, 벌금 규칙 설정
 ├─ lib/velog.ts      # Velog API 조회 + 벌금 계산 로직
 └─ app/page.tsx      # 대시보드 화면
src/                  # (구) Mattermost 알림용 Java 코드 — 사용 안 함
```

## 설정 변경

`web/lib/config.ts`에서 수정 후 push하면 자동 재배포됩니다.

| 항목 | 설명 |
|---|---|
| `RESET_DATE` | 정산 시작일 (벌금 초기화 시 이 날짜만 변경) |
| `USERNAMES` | 멤버 velog 아이디 |
| `REQUIRED_COUNT` 등 | 벌금 규칙 |

## 기여

버그 제보나 기능 제안은 [Issues](https://github.com/yurad12/velog-weekly-checker/issues)에 올려주세요. 수정은 브랜치 생성 후 PR로 부탁드립니다.
