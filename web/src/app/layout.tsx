import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "@/components/app-shell"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
export const metadata: Metadata = { title: "SupeRR Selector · Reliable Players Under Pressure", description: "Top 10 T20 batters and bowlers under pressure: ratings, evidence, stability and validation, built from the supplied data only." }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body><TooltipProvider><AppShell>{children}</AppShell></TooltipProvider></body>
    </html>
  )
}
