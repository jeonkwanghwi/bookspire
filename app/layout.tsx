import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Gowun_Batang, Newsreader, Public_Sans } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
});

const gowunBatang = Gowun_Batang({
  variable: "--font-gowun",
  weight: ["400", "700"],
  preload: false,
});

const cormorant = Cormorant_Garamond({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["600"],
});

const publicSans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bookspire.vercel.app"),
  title: "Bookspire",
  description: "한줄에서 오는 영감, 비로소 시작되는 정독",
  openGraph: {
    title: "Bookspire",
    description: "완독을 해야만 영감을 얻는 건 아니잖아요?",
    siteName: "Bookspire",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${newsreader.variable} ${gowunBatang.variable} ${cormorant.variable} ${publicSans.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
