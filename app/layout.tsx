import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RxBridge, Your Personal Healthcare Assistant",
  description:
    "RxBridge is a conversational healthcare assistant. Talk or type to ask general health questions, see your medications and refill timing, and get realtime alerts about shortages and outbreaks. Educational information only, not a substitute for professional medical care.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f7ae0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
