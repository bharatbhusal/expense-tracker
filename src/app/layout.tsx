import type { Metadata, Viewport } from "next";

import { AppProvider } from "@/components/providers/app-provider";
import { UiRestriction } from "@/components/providers/ui-restriction";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const APP_THEME_COLOR = "#1a1a1a";
const APP_NAME = "Track My Biryani";
const APP_DESCRIPTION = "Track daily expenses with analytics and categories.";

export const metadata: Metadata = {
  metadataBase: new URL("https://trackmybiryani.bharatbhusal.com"),
  manifest: "/manifest.webmanifest",
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: "/",
    siteName: APP_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: APP_THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh transition-colors duration-200">
        <UiRestriction>
          <AppProvider>{children}</AppProvider>
        </UiRestriction>
        <Analytics />
      </body>
    </html>
  );
}
