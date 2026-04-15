"use client"

import type { ReactNode } from "react"
import { AlertTriangle, Brain, FileText, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { InferenceResponse } from "@/lib/types"

interface ResultPanelProps {
  result: InferenceResponse | null
  isLoading?: boolean
  className?: string
}

export function ResultPanel({ result, isLoading, className }: ResultPanelProps) {
  const hasAnomaly = Boolean(result?.class && result.class !== "Normal")
  const primaryEvent = result?.results?.[0] ?? null
  const timeRange = primaryEvent
    ? `${formatResultTime(primaryEvent.start)} – ${formatResultTime(primaryEvent.end)}`
    : "--"
  const classNameValue = result?.class || "--"

  return (
    <div className={cn("grid h-full min-h-0 grid-rows-[2fr_5fr_5fr] gap-4", className)}>
      <div className="grid min-h-0 grid-cols-2 gap-4">
        <SummaryCard
          title="异常类别"
          value={classNameValue}
          isLoading={isLoading}
          highlight={hasAnomaly}
          accent="primary"
          icon={<AlertTriangle className={cn("h-4 w-4", hasAnomaly ? "text-destructive" : "text-primary")} />}
        />
        <SummaryCard
          title="异常区间"
          value={timeRange}
          isLoading={isLoading}
          highlight={hasAnomaly}
          accent="secondary"
          icon={<Tag className="h-4 w-4 text-secondary" />}
        />
      </div>

      <SectionCard title="事件描述" icon={<FileText className="h-4 w-4 text-primary" />}>
        {isLoading ? (
          <SectionState label="AI 正在生成事件描述..." />
        ) : result?.results?.length ? (
          <div className="space-y-3">
            {result.results.map((event, index) => (
              <div
                key={index}
                className="relative rounded-lg border border-border/50 bg-muted/20 p-4 pl-5"
              >
                <div className="absolute left-0 top-4 h-10 w-1 rounded-r bg-primary" />
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {event.class_name || result.class}
                  </Badge>
                  <span className="text-xs font-mono text-secondary">
                    [{formatResultTime(event.start)} - {formatResultTime(event.end)}]
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{event.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <SectionState label="分析完成后将显示事件描述。" isEmpty />
        )}
      </SectionCard>

      <SectionCard title="模型推理" icon={<Brain className="h-4 w-4 text-secondary" />}>
        {isLoading ? (
          <SectionState label="AI 正在整理模型推理..." />
        ) : result?.results?.some((event) => event.reason) ? (
          <div className="space-y-3">
            {result.results.map((event, index) => (
              <div
                key={index}
                className="rounded-lg bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-secondary/50 text-secondary">
                    <Tag className="mr-1 h-3 w-3" />
                    {event.class_name || result.class}
                  </Badge>
                  <span className="text-xs font-mono text-secondary">
                    [{formatResultTime(event.start)} - {formatResultTime(event.end)}]
                  </span>
                </div>
                <p>{event.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <SectionState label="分析完成后将显示模型推理。" isEmpty />
        )}
      </SectionCard>
    </div>
  )
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="glass-panel neon-border flex min-h-0 flex-col p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </h4>
      <div className="cyber-scroll min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
    </div>
  )
}

function SectionState({ label, isEmpty = false }: { label: string; isEmpty?: boolean }) {
  return (
    <div className="flex h-full min-h-[96px] items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/15 px-4 text-center">
      <div className="flex flex-col items-center gap-2">
        {!isEmpty && <Spinner className="h-5 w-5 text-primary" />}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function InlineLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Spinner className="h-5 w-5 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function InlineEmpty({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>
}

function formatResultTime(value: string | number): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const mins = Math.floor(value / 60)
    const secs = Math.floor(value % 60)
    const tenths = Math.floor((value % 1) * 10)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${tenths}`
  }

  return String(value)
}

function SummaryCard({
  title,
  value,
  isLoading,
  highlight,
  accent,
  icon,
}: {
  title: string
  value: string
  isLoading?: boolean
  highlight: boolean
  accent: "primary" | "secondary"
  icon: ReactNode
}) {
  return (
    <div
      className={cn(
        "glass-panel flex min-h-0 items-center justify-between gap-3 border p-4",
        accent === "primary" && (highlight ? "border-destructive/50 glow-red" : "border-primary/50 glow-cyan"),
        accent === "secondary" && "border-secondary/40 glow-gold"
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      <div className="flex min-w-0 justify-end">
        {isLoading ? (
          <InlineLoading label="分析中..." />
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "max-w-full shrink truncate px-3 py-1.5 text-right text-sm",
              accent === "primary" && (highlight ? "border-destructive/50 bg-destructive/15 text-destructive" : "border-primary/50 bg-primary/10 text-primary"),
              accent === "secondary" && "border-secondary/50 bg-secondary/10 text-secondary"
            )}
          >
            {value}
          </Badge>
        )}
      </div>
    </div>
  )
}
