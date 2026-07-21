import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { AuditTrail } from "@/components/audit-trail";
import { SoundEffectsProvider } from "@/components/sound-effects";
import { SquircleNoScript } from "@/components/squircle";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eGov Agent — Your AI Government Services Assistant",
  description:
    "An open-source eGov Hackathon 2026 prototype developed by Bryl Lim.",
  authors: [{ name: "Bryl Lim", url: "https://bryllim.com" }],
  creator: "Bryl Lim",
  metadataBase: new URL("https://github.com/bryllim/egov-agent"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SquircleNoScript />
        <SoundEffectsProvider>
          <AuditTrail>{children}</AuditTrail>
        </SoundEffectsProvider>
      </body>
    </html>
  );
}
