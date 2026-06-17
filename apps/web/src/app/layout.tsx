import type { Metadata } from "next";
import { SlotSaverProvider } from "@/features/slotsaver/SlotSaverContext";
import NotificationToast from "@/components/slotsaver/NotificationToast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cureva | AI",
  description: "Autonomous Clinical Operations & Agentic Patient Triage Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SlotSaverProvider>
          {children}
          <NotificationToast />
        </SlotSaverProvider>
      </body>
    </html>
  );
}
