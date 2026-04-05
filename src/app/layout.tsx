import type { Metadata } from "next";
import { Bebas_Neue, Instrument_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import Navbar from "@/components/Navbar";

const bebas = Bebas_Neue({ 
  weight: "400", 
  subsets: ["latin"], 
  variable: "--font-bebas" 
});

const instrument = Instrument_Sans({ 
  subsets: ["latin"], 
  variable: "--font-body" 
});

const dmMono = DM_Mono({ 
  weight: "400",
  subsets: ["latin"], 
  variable: "--font-mono" 
});

export const metadata: Metadata = {
  title: "Fraudchills | Consumer protection & fraud intelligence",
  description: "Verified complaints, analytics, and brand accountability for e-commerce.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#FAF7F2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bebas.variable} ${instrument.variable} ${dmMono.variable}`}>
      <body className="antialiased">
        <SessionProvider>
          <Navbar />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
