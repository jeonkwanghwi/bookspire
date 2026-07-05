import type { Metadata } from "next";
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
  title: "Bookspire",
  description: "한줄에서 오는 영감, 비로소 시작되는 정독",
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
