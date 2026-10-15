import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "SAH AI · Operations Manager", description: "Institutional operations, accountability, and delegation.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
