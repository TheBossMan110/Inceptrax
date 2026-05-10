import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://www.inceptrax.com"),

  title: {
    default: "Inceptrax — AI Startup Idea Validation & Business Plan Generator",
    template: "%s | Inceptrax",
  },
  description:
    "Validate your startup idea with AI-powered analysis. Get market research, competitor analysis, monetization strategy, MVP blueprint, and a go-to-market plan — in minutes. The #1 startup idea validation tool for founders.",

  keywords: [
    "startup idea validation tool",
    "AI business plan generator",
    "market research for startups",
    "competitor analysis AI",
    "startup idea analyzer",
    "AI pitch deck generator",
    "business idea validator online",
    "inceptrax",
    "startup validation",
    "AI co-founder",
    "MVP planning tool",
    "go-to-market strategy AI",
  ],

  authors: [{ name: "Inceptrax", url: "https://www.inceptrax.com" }],
  creator: "Inceptrax",
  publisher: "Inceptrax",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    title: "Inceptrax — AI Startup Idea Validation Tool",
    description:
      "Stop guessing. Validate your startup idea with 8-stage AI analysis — market research, competitors, monetization, MVP, and GTM strategy. Built for founders.",
    url: "https://www.inceptrax.com",
    siteName: "Inceptrax",
    locale: "en_US",
    images: [
      {
        url: "https://www.inceptrax.com/og-home.png",
        width: 1200,
        height: 630,
        alt: "Inceptrax — AI-Powered Startup Idea Validation",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Inceptrax — Validate Your Startup Idea with AI",
    description:
      "8-stage AI analysis: market research, competitor analysis, monetization, MVP blueprint & GTM strategy. Free for founders.",
    images: ["https://www.inceptrax.com/og-home.png"],
    creator: "@inceptrax",
  },

  alternates: {
    canonical: "https://www.inceptrax.com",
  },

  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
}

import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/sonner"
import { VisitTracker } from "@/components/visit-tracker"
import { PostHogProvider } from "@/components/posthog-provider"
import { LenisProvider } from "@/components/lenis-provider"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://www.inceptrax.com" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        <PostHogProvider>
          <AuthProvider>
            <LenisProvider>
              <VisitTracker />
              {children}
            </LenisProvider>
            <Toaster />
          </AuthProvider>
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  )
}
