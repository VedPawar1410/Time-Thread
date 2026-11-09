import type { Metadata } from "next";
import { DM_Mono, Hanken_Grotesk, Young_Serif } from "next/font/google";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

const youngSerif = Young_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const dmMono = DM_Mono({
  variable: "--font-timecode",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Time-Thread | Conversation Timeline Mapper",
  description:
    "Transform long-form transcripts into interactive, branching visual graphs",
  keywords: [
    "transcript",
    "visualization",
    "timeline",
    "conversation",
    "graph",
    "react-flow",
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en" className="dark">
      <body
        className={`${hankenGrotesk.variable} ${youngSerif.variable} ${dmMono.variable} font-sans min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
