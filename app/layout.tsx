import "@/app/globals.css";

import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";

import { siteConfig } from "../config/site";

export const metadata: Metadata = {
  title: {
    default: "Hawk Aerospace | Aerial Intelligence, Geospatial Technology & AI",
    template: `%s - ${siteConfig.name}`,
  },
  metadataBase: new URL(siteConfig.url),
  description: siteConfig.description,
  keywords: [
    "drone survey",
    "aerial mapping",
    "geospatial intelligence",
    "LiDAR",
    "photogrammetry",
    "GIS",
    "digital twin",
    "3D mapping",
    "AI inspection",
    "precision agriculture",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: "Hawk Aerospace | Aerial Intelligence, Geospatial Technology & AI",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hawk Aerospace | Aerial Intelligence, Geospatial Technology & AI",
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body className="bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
