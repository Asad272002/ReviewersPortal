import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { MotionProvider } from "./context/MotionContext";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Reviewers Portal",
  description: "Deep Funding Reviewers Portal",
  icons: {
    icon: [
      {
        url: "/reviewerlogo.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/reviewerlogo.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    shortcut: "/reviewerlogo.png",
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
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        <AuthProvider>
          <MotionProvider>
            {children}
            <Analytics />
          </MotionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
