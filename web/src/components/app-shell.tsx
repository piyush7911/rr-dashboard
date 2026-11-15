"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, Menu, BookOpen, FileText, FlaskConical, Gauge, LayoutDashboard, ListOrdered, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ControlPanel } from "@/components/control-panel"
import { useParams } from "@/lib/params"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard }, { href: "/lab", label: "Pressure Lab", icon: Gauge }, { href: "/rankings", label: "Rankings", icon: ListOrdered },
  { href: "/robustness", label: "Robustness", icon: ShieldCheck }, { href: "/players", label: "Player Cards", icon: UserRound }, { href: "/replay", label: "Match Replay", icon: Activity },
  { href: "/evidence", label: "Evidence", icon: FlaskConical }, { href: "/method", label: "Method", icon: BookOpen }, { href: "/report", label: "Report", icon: FileText },
]
const DOCKED = ["/lab", "/rankings", "/players", "/replay"]
const MODE = { consensus: "Consensus", leverage: "Leverage", rule: "Rule-based", custom: "Custom mix" }

function SidebarBody({ path }: { path: string }) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-rr-pink to-[#b3125f] text-sm font-black text-white shadow-lg shadow-rr-pink/30">RR</div>
        <div className="leading-tight"><div className="text-[15px] font-semibold text-white">SupeRR Selector</div><div className="text-[11px] text-sidebar-foreground/60">Round 1</div></div>
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
      <div className="m-3 rounded-lg bg-white/5 px-3 py-2 text-[11px] leading-snug text-sidebar-foreground/70">
        <div className="flex items-center gap-1.5 font-semibold text-white"><span className="size-1.5 rounded-full bg-emerald-400" />Supplied data only</div>
        No external data.
      </div>
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = (usePathname() || "/").replace(/(.)\/$/, "$1"); const { pressure, dirty } = useParams(); const docked = DOCKED.includes(path); const [menu, setMenu] = useState(false)
  useEffect(() => setMenu(false), [path])
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <SidebarBody path={path} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/85 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 text-xs">
            <Sheet open={menu} onOpenChange={setMenu}>
              <SheetTrigger render={<Button variant="outline" size="icon" className="mr-1 size-8 md:hidden" aria-label="Open menu" />}><Menu className="size-4" /></SheetTrigger>
              <SheetContent side="left" className="flex w-[264px] flex-col gap-0 border-0 bg-sidebar p-0 text-sidebar-foreground sm:max-w-[264px]"><SheetTitle className="sr-only">Navigation</SheetTitle><SidebarBody path={path} /></SheetContent>
            </Sheet>
            <span className="hidden text-muted-foreground sm:inline">Pressure definition</span>
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">{MODE[pressure.mode]} · top {((1 - pressure.high_pct) * 100).toFixed(0)}%</span>
            {dirty && <span className="rounded-full bg-accent px-2 py-1 font-medium text-accent-foreground">Custom settings</span>}
          </div>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="sm" className={cn("gap-1.5", docked && "xl:hidden")} />}><SlidersHorizontal className="size-3.5" />Adjust definition</SheetTrigger>
            <SheetContent side="right" className="w-[340px] overflow-y-auto p-0 sm:max-w-[340px]"><SheetTitle className="sr-only">Definition and scoring</SheetTitle><ControlPanel /></SheetContent>
          </Sheet>
        </header>
        <div className="flex min-w-0 flex-1">
          <main className="min-w-0 flex-1 px-5 py-7 md:px-8"><div className="mx-auto max-w-[1180px]">{children}</div></main>
          <aside className={cn("sticky top-14 hidden h-[calc(100vh-56px)] shrink-0 overflow-hidden border-l bg-card transition-[width,opacity,border-color] duration-300 ease-out xl:block", docked ? "w-[316px] border-border opacity-100" : "w-0 border-transparent opacity-0")}><div className="h-full w-[316px] overflow-y-auto"><ControlPanel /></div></aside>
        </div>
      </div>
    </div>
  )
}
