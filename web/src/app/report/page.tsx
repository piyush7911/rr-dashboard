"use client"
import { Download } from "lucide-react"
import { PageHeader } from "@/components/ui-bits"

export default function Report() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Methodology report" title="The full report" desc="Pressure definition, performance measurement, fair comparisons, evidence for the top 10, and reliability and limitations." right={<a href="/report.pdf" download className="inline-flex items-center gap-2 rounded-lg bg-rr-blue px-3 py-2 text-xs font-semibold text-white"><Download className="size-3.5" />Download PDF</a>} />
      <div className="overflow-hidden rounded-xl border border-border bg-card"><iframe title="Methodology report" src="/report.pdf#view=FitH" className="h-[82vh] w-full" /></div>
    </div>
  )
}
