import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import Script from "next/script";
import Head from "next/head";
import { UserDataProvider } from "@/contexts/UserDataContext";
import ChatWidget from "@/components/chat/ChatWidget";
import { siteConfig } from "@/config/site";
import "./globals.css";

const poppins = localFont({
  src: "./fonts/Poppins.woff2",
  variable: "--font-poppins",
  weight: "400",
  preload: false,
});
const raleway = localFont({
  src: "./fonts/Raleway.woff2",
  variable: "--font-raleway",
  weight: "100 900",
});

const opensans = localFont({
  src: "./fonts/Open Sans.woff2",
  variable: "--font-open-sans",
  weight: "100 800",
});

const siteTitle = `${siteConfig.displayName} - ${siteConfig.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    template: `%s | ${siteConfig.displayName}`,
    default: siteTitle,
  },
  description: siteConfig.description,
  keywords: [
    "online supermarket",
    "grocery delivery",
    "fresh produce",
    "online grocery shopping",
    "household essentials",
    "deals",
    "discounts",
    siteConfig.name,
    siteConfig.displayName,
  ],
  authors: [{ name: siteConfig.displayName }],
  creator: siteConfig.displayName,
  publisher: siteConfig.displayName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.displayName,
    title: siteTitle,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.logo.src,
        width: siteConfig.logo.width,
        height: siteConfig.logo.height,
        alt: siteConfig.logo.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteConfig.description,
    images: [siteConfig.logo.src],
  },
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
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
  alternates: {
    canonical: siteConfig.url,
  },
};

/** Brand colours from .env, exposed as CSS variables (see app/globals.css). */
const brandStyle = {
  "--brand-primary": siteConfig.colors.primary,
  "--brand-primary-hover": siteConfig.colors.primaryHover,
  "--brand-dark": siteConfig.colors.dark,
  "--brand-dark-hover": siteConfig.colors.darkHover,
  "--brand-accent": siteConfig.colors.accent,
  "--brand-tint": siteConfig.colors.tint,
  "--brand-primary-soft": siteConfig.colors.primarySoft,
} as CSSProperties;

const RootLayout = async ({ children }: { children: ReactNode }) => {
  // Optional: set NEXT_PUBLIC_ADSENSE_CLIENT_ID in .env to enable Google AdSense.
  const GADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  return (
    <ClerkProvider>
      <html lang="en" style={brandStyle}>
        {GADSENSE_CLIENT_ID && (
          <Head>
            <meta name="google-adsense-account" content={GADSENSE_CLIENT_ID} />
          </Head>
        )}
        <body
          className={`${poppins.variable} ${raleway.variable} ${opensans.variable} antialiased`}
        >
          <UserDataProvider>{children}</UserDataProvider>
          <ChatWidget />
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "#ffffff",
                color: "#1f2937",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
              },
              className: "sonner-toast",
            }}
          />

          {GADSENSE_CLIENT_ID && (
            <Script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GADSENSE_CLIENT_ID}`}
              strategy="beforeInteractive"
            />
          )}
        </body>
      </html>
    </ClerkProvider>
  );
};

export default RootLayout;
