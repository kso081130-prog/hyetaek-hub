import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold text-ink">
              🌱 {SITE_NAME}
            </Link>
            <nav className="flex gap-5 text-sm font-medium text-ink-soft">
              <Link href="/" className="hover:text-accent">
                전체 글
              </Link>
              <Link href="/tools/subsidy-calculator" className="hover:text-accent">
                지원금 계산기
              </Link>
              <Link href="/about" className="hover:text-accent">
                소개
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-ink-soft flex flex-wrap gap-4">
            <span>&copy; {new Date().getFullYear()} {SITE_NAME}</span>
            <Link href="/privacy" className="hover:text-accent">
              개인정보처리방침
            </Link>
            <Link href="/about" className="hover:text-accent">
              소개
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
