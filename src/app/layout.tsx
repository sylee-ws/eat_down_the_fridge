import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "냉장고 파먹기 룰렛",
  description: "냉장고 재료로 15분 컷 레시피를 룰렛으로 뽑고, 부족한 재료만 장바구니에 담아요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
