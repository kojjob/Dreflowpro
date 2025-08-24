import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: "DreflowPro - Advanced Data Pipeline Platform",
  description: "Transform your data with AI-powered pipelines, real-time analytics, and intelligent insights. Built for modern data teams.",
  keywords: ["data pipeline", "ETL", "analytics", "AI", "data processing"],
  authors: [{ name: "DreflowPro Team" }],
  creator: "DreflowPro",
  publisher: "DreflowPro",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "DreflowPro - Advanced Data Pipeline Platform",
    description: "Transform your data with AI-powered pipelines, real-time analytics, and intelligent insights.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "DreflowPro - Advanced Data Pipeline Platform",
    description: "Transform your data with AI-powered pipelines, real-time analytics, and intelligent insights.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            expand={false}
            richColors
            closeButton
          />
        </AuthProvider>
      </body>
    </html>
  );
}
