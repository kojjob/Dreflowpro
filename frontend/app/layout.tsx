import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GlobalErrorBoundary, AuthErrorBoundary } from "./components/error-boundaries";
import { OfflineIndicator } from "./components/ui";
import { ClientProviders } from "./components/providers/ClientProviders";
import { GoogleAnalytics } from "./components/analytics/GoogleAnalytics";
import { generateOrganizationSchema, generateSoftwareApplicationSchema } from "./utils/seo";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "DreflowPro - AI-Powered ETL Platform for SMEs | No-Code Data Integration",
    template: "%s | DreflowPro"
  },
  description: "Transform your business data with our no-code ETL platform. Connect 50+ integrations, build pipelines in 5 minutes, and get AI-powered insights. Perfect for SMEs starting free.",
  keywords: [
    "ETL platform", "data integration", "business intelligence", "data pipeline", 
    "SME data tools", "no-code ETL", "AI-powered analytics", "data transformation",
    "business automation", "data connectors", "QuickBooks integration", "Shopify ETL",
    "Salesforce connector", "data warehouse", "real-time analytics", "data visualization"
  ],
  authors: [{ name: "DreflowPro Team", url: "https://dreflowpro.com/about" }],
  creator: "DreflowPro",
  publisher: "DreflowPro",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: "DreflowPro",
    title: "DreflowPro - AI-Powered ETL Platform for SMEs",
    description: "Transform your business data with our no-code ETL platform. Connect 50+ integrations, build pipelines in 5 minutes, and get AI-powered insights.",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "DreflowPro ETL Platform Dashboard",
        type: "image/jpeg"
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@dreflowpro",
    creator: "@dreflowpro",
    title: "DreflowPro - AI-Powered ETL Platform for SMEs",
    description: "Transform your business data with our no-code ETL platform. Connect 50+ integrations, build pipelines in 5 minutes, and get AI-powered insights.",
    images: ["/images/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      "msvalidate.01": process.env.BING_SITE_VERIFICATION || "",
    },
  },
  category: "Business Software",
  classification: "ETL Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: generateOrganizationSchema(),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: generateSoftwareApplicationSchema(),
          }}
        />
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.dreflowpro.com" />
        
        {/* DNS Prefetch for performance */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalErrorBoundary>
          <AuthErrorBoundary>
            <ThemeProvider>
              <AuthProvider>
                <GoogleAnalytics />
                {children}
                <OfflineIndicator />
                <Toaster
                  position="top-right"
                  expand={false}
                  richColors
                  closeButton
                />
                <ClientProviders />
              </AuthProvider>
            </ThemeProvider>
          </AuthErrorBoundary>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
