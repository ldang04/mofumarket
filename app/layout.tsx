import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MofuMarket - Predictive Markets for Social Events",
  description: "Create parties and bet on events with fake currency",
  icons: {
    icon: '/assets/images/mofu_icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-slate-900`}
      >
        <nav className="border-b border-slate-200 bg-white shadow-sm relative z-50">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <Link href="/" className="flex items-center gap-3 text-3xl font-bold text-slate-900 hover:text-slate-700 transition-colors">
              <Image src="/assets/images/mofu_icon.png" alt="Mofu" width={36} height={36} />
              MofuMarket
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
