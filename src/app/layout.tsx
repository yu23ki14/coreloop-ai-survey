import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "オンライン広告詐欺に関する調査",
  description:
    "オンライン広告詐欺への対策について、市民のみなさまのご意見をお聞きする調査です。熟議型世論調査の事前調査として実施します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white">{children}</body>
    </html>
  );
}
