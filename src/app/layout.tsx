import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internet Headline Map",
  description: "See what the world is talking about right now",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-gray-950">
      <body className="h-full text-white antialiased">{children}<Analytics /></body>
    </html>
  );
}
