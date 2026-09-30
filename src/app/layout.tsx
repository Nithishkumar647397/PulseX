import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "PulseX",
  description: "Never miss what matters.",
};

export const viewport: Viewport = {
  themeColor: '#F8FAFC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#F8FAFC] text-[#0F172A] selection:bg-amber-100 selection:text-amber-700 pb-[env(safe-area-inset-bottom)]">
        <Navigation />
        <main className="md:ml-64 min-h-screen flex justify-center w-full">
          <div className="w-full max-w-[430px] min-h-screen relative pb-20 md:pb-0 overflow-x-hidden">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </body>
    </html>
  );
}
