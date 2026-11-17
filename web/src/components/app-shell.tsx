"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, FileText, Gauge, LayoutDashboard, ListOrdered, Menu, ShieldCheck, UserRound, FlaskConical } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard }, { href: "/rankings", label: "Rankings", icon: ListOrdered }, { href: "/players", label: "Player Cards", icon: UserRound },
  { href: "/pressure", label: "Pressure", icon: Gauge }, { href: "/validation", label: "Validation", icon: FlaskConical }, { href: "/stability", label: "Stability", icon: ShieldCheck },
  { href: "/method", label: "Method", icon: BookOpen }, { href: "/report", label: "Report", icon: FileText },
]

function SidebarBody({ path }: { path: string }) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-rr-pink to-[#b3125f] text-sm font-black text-white shadow-lg shadow-rr-pink/30">RR</div>
        <div className="leading-tight"><div className="text-[15px] font-semibold text-white">SupeRR Selector</div><div className="text-[11px] text-sidebar-foreground/60">Season 2 · Round 1</div></div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((n) => {
          const on = n.href === "/" ? path === "/" : path.startsWith(n.href)
          return (
            <Link key={n.href} href={n.href} className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition", on ? "bg-white/10 text-white" : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white")}>
              {on && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-rr-pink" />}
              <n.icon className={cn("size-[17px]", on ? "text-rr-pink" : "opacity-70")} />{n.label}
            </Link>
          )
        })}
      </nav>
      <div className="m-3 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-sidebar-foreground/70">
        <div className="flex items-center gap-1.5 font-semibold text-white"><span className="size-1.5 rounded-full bg-emerald-400" />Supplied data only</div>
      </div>
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = (usePathname() || "/").replace(/(.)\/$/, "$1"); const [menu, setMenu] = useState(false)
  useEffect(() => setMenu(false), [path])
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex"><SidebarBody path={path} /></aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/85 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 text-xs">
            <Sheet open={menu} onOpenChange={setMenu}>
              <SheetTrigger render={<Button variant="outline" size="icon" className="mr-1 size-8 md:hidden" aria-label="Open menu" />}><Menu className="size-4" /></SheetTrigger>
              <SheetContent side="left" className="flex w-[264px] flex-col gap-0 border-0 bg-sidebar p-0 text-sidebar-foreground sm:max-w-[264px]"><SheetTitle className="sr-only">Navigation</SheetTitle><SidebarBody path={path} /></SheetContent>
            </Sheet>
            <span className="font-semibold text-foreground">Reliable Players Under Pressure</span>
            <span className="hidden rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground sm:inline">Top 10 batters and bowlers under pressure</span>
          </div>
          <Link href="/report" className="rounded-lg bg-rr-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110">Methodology report</Link>
        </header>
        <main className="min-w-0 flex-1 px-5 py-7 md:px-8"><div className="mx-auto max-w-[1180px]">{children}</div></main>
      </div>
    </div>
  )
}
