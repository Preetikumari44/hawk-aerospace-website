import type { Metadata } from "next";

import { AuthProvider } from "@/lib/skymap/auth-context";

export const metadata: Metadata = {
  title: "SkyMap™ | Hawk Aerospace",
  description:
    "Explore, measure and customize properties in immersive 3D with SkyMap's AI-powered property intelligence platform — a Hawk Aerospace product.",
};

export default function SkyMapLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthProvider>{children}</AuthProvider>;
}
