import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LMS — 研修管理システム",
  description: "マネージャー向け研修 e ラーニング",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
