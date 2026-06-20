import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-bricolage",
  display: "swap",
});

const siteUrl = "https://yawningface.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Yawning Face STT — speak, and it's typed for you",
  description:
    "A voice-first, on-device dictation app for your desktop. Hold a hotkey, talk naturally, and your words land in whatever app you're using. Runs locally, private by design, multilingual. Windows and macOS.",
  keywords: [
    "dictation",
    "speech to text",
    "voice typing",
    "on-device transcription",
    "offline speech recognition",
    "Parakeet",
    "Whisper",
    "privacy",
    "YawningFace",
  ],
  authors: [{ name: "YawningFace" }],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Yawning Face STT — speak, and it's typed for you",
    description:
      "Voice-first dictation for your desktop. Hold a hotkey, talk, and your words appear in any app — on-device and private.",
    url: siteUrl,
    siteName: "Yawning Face STT",
    images: [{ url: "/logo.png", width: 400, height: 400, alt: "Yawning Face STT" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yawning Face STT — speak, and it's typed for you",
    description:
      "Voice-first dictation for your desktop. On-device, private, multilingual.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#fefdfb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
