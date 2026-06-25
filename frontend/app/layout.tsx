import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Clone",
  description: "A privacy-focused messaging app (assignment clone)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
