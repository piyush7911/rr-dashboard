"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { API } from "@/lib/api"
import { Loading, PageHeader } from "@/components/ui-bits"
import { useGet } from "@/lib/use-api"

type Info = { pages: number; sizes: number[][] }
const MAXW = 860   // widest page at 100% (= fit to the available width, capped for large screens)

function PageCanvas({ n, w, h, onVisible }: { n: number; w: number; h: number; onVisible: (n: number) => void }) {
  const box = useRef<HTMLDivElement>(null); const cv = useRef<HTMLCanvasElement>(null); const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  useEffect(() => {
    const el = box.current; if (!el) return
    const io = new IntersectionObserver((es) => { for (const e of es) { if (e.isIntersecting) { if (e.intersectionRatio > 0.35) onVisible(n); setState((s) => (s === "idle" ? "loading" : s)) } } }, { rootMargin: "600px 0px", threshold: [0, 0.35] })
    io.observe(el); return () => io.disconnect()
  }, [n, onVisible])
  useEffect(() => {
    if (state !== "loading") return
    let dead = false
    fetch(`${API}/api/report/page/${n}`, { cache: "no-store" }).then((r) => r.blob()).then((b) => createImageBitmap(b)).then((bm) => {
      if (dead || !cv.current) return; cv.current.width = bm.width; cv.current.height = bm.height; cv.current.getContext("2d")!.drawImage(bm, 0, 0); setState("done")
    }).catch(() => !dead && setState("error"))
    return () => { dead = true }
  }, [state, n])
  return (
    <div ref={box} data-page={n} className="relative mx-auto mb-5 overflow-hidden rounded-md bg-white shadow-[0_2px_18px_rgba(10,26,74,0.12)] ring-1 ring-border" style={{ width: w, height: h }}>
      <canvas ref={cv} className="size-full select-none" style={{ pointerEvents: "none" }} />
      {state !== "done" && <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">{state === "error" ? "Page unavailable" : <span className="animate-pulse">Loading page {n}…</span>}</div>}
      <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} />
    </div>
  )
}

export default function Report() {
  const { data: info, error } = useGet<Info>("/report/info"); const [zoom, setZoom] = useState(1); const [cur, setCur] = useState(1); const wrap = useRef<HTMLDivElement>(null); const [cw, setCw] = useState(0);
  const onVisible = useCallback((n: number) => setCur(n), [])
  // view-only: block copy, save, print, select-all and the context menu while this page is open
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault()
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && ["s", "p", "c", "a", "u", "x"].includes(e.key.toLowerCase())) e.preventDefault() }
    document.addEventListener("copy", stop); document.addEventListener("cut", stop); document.addEventListener("contextmenu", stop); document.addEventListener("dragstart", stop); window.addEventListener("keydown", key)
    document.body.classList.add("report-locked")
    return () => { document.removeEventListener("copy", stop); document.removeEventListener("cut", stop); document.removeEventListener("contextmenu", stop); document.removeEventListener("dragstart", stop); window.removeEventListener("keydown", key); document.body.classList.remove("report-locked") }
  }, [])
  const go = (n: number) => document.querySelector(`[data-page="${n}"]`)?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" })
  // 100% = the page fits the screen width (default on every device); zoom in to read small print and scroll sideways to pan.
  useEffect(() => {
    const el = wrap.current; if (!el) return
    const ro = new ResizeObserver(() => setCw(el.clientWidth)); ro.observe(el); setCw(el.clientWidth); return () => ro.disconnect()
  }, [!!info])
  const width = Math.min(MAXW, cw || MAXW) * zoom
  return (
    <div className="select-none">
      <PageHeader eyebrow="Report" title="Methodology report" desc="How pressure is defined, how the ratings are built, and the evidence behind the final lists." />
      {error ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">The report is not available. Start the API and try again.</div> : !info ? <Loading h={500} /> : (
        <div className="rounded-2xl bg-[#e9edf6] p-3 sm:p-5">
          <div className="sticky top-16 z-10 mx-auto mb-4 flex w-fit items-center gap-1 rounded-full bg-rr-navy px-2 py-1.5 text-white shadow-lg">
            <button onClick={() => go(Math.max(1, cur - 1))} className="rounded-full px-2.5 py-1 text-sm hover:bg-white/10" aria-label="Previous page">‹</button>
            <span className="num min-w-[78px] text-center text-xs font-medium">Page {cur} / {info.pages}</span>
            <button onClick={() => go(Math.min(info.pages, cur + 1))} className="rounded-full px-2.5 py-1 text-sm hover:bg-white/10" aria-label="Next page">›</button>
            <span className="mx-1 h-4 w-px bg-white/20" />
            <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Zoom out"><Minus className="size-3.5" /></button>
            <span className="num w-11 text-center text-xs">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Zoom in"><Plus className="size-3.5" /></button>
          </div>
          <div ref={wrap} className="overflow-x-auto pb-2">
            {info.sizes.map(([pw, ph], i) => <PageCanvas key={i} n={i + 1} w={width} h={(width * ph) / pw} onVisible={onVisible} />)}
          </div>
        </div>
      )}
    </div>
  )
}
