import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppNavigation } from "@/components/app-navigation";
import { APP_SHELL_STYLE } from "@/lib/layout";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Merch Drop",
  description: "Launch a one-page merch drop in minutes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistSans.className} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={APP_SHELL_STYLE}>
        <Providers>
          <AppNavigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
