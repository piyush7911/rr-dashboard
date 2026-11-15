import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ParamsProvider } from "@/lib/params"
import { AppShell } from "@/components/app-shell"
import { Prefetcher } from "@/lib/prefetch"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
export const metadata: Metadata = { title: "SupeRR Selector · Pressure Lab", description: "Who delivers when it matters? Interactive pressure definition, ratings and rankings for T20 batters and bowlers." }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        <TooltipProvider><ParamsProvider><Prefetcher /><AppShell>{children}</AppShell></ParamsProvider></TooltipProvider>
      </body>
    </html>
  )
}
