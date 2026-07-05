import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velog 스터디 벌금 정산",
  description: "주간 블로그 작성 체크 및 벌금 정산 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
