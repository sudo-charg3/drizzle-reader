import type { Metadata, Viewport } from "next";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";
import OfflineBanner from "@/components/OfflineBanner";
import SyncQueueDrainer from "@/components/SyncQueueDrainer";
import OfflineAuthProvider from "@/components/OfflineAuthProvider";
import SyncIndicator from "@/components/SyncIndicator";

export const metadata: Metadata = {
  title: "Drizzle Reader",
  description: "Beautiful PDF reading experience",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Drizzle Reader",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    title: "Drizzle Reader",
    description: "Beautiful PDF reading experience",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f4ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Literata:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Drizzle Reader" />
        <link rel="apple-touch-icon" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
      </head>
      <body>
        <OfflineAuthProvider>
          <SyncIndicator />
          <OfflineBanner />
          {children}
          <InstallPrompt />
          <SyncQueueDrainer />
        </OfflineAuthProvider>
      </body>
    </html>
  );
}
