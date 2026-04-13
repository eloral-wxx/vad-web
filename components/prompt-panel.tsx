"use client"

import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface PromptPanelProps {
  anomalyPrompt: string
  onAnomalyPromptChange: (value: string) => void
  className?: string
}

const PROMPT_TEMPLATES = [
  {
    label: "交通事故检测",
    value: "Detect traffic accidents, vehicle collisions, or dangerous driving behaviors",
  },
  {
    label: "打架斗殴检测",
    value: "Detect physical fights, violence, or aggressive confrontations between people",
  },
  {
    label: "跌倒检测",
    value: "Detect people falling down, slipping, or collapsing",
  },
  {
    label: "火灾检测",
    value: "Detect fire, smoke, or burning objects",
  },
  {
    label: "盗窃行为检测",
    value: "Detect theft, stealing, or suspicious removal of objects",
  },
]

export function PromptPanel({
  anomalyPrompt,
  onAnomalyPromptChange,
  className,
}: PromptPanelProps) {
  return (
    <div className={cn("h-full", className)}>
      <div className="glass-panel neon-border flex h-full min-h-0 flex-col overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20">
              <span className="text-xs font-bold text-primary">A</span>
            </div>
            <h3 className="text-sm font-medium text-foreground">定义异常</h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-border/50 bg-input/40 hover:border-primary/50 hover:bg-primary/10"
              >
                模板
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {PROMPT_TEMPLATES.map((template) => (
                <DropdownMenuItem
                  key={template.label}
                  onClick={() => onAnomalyPromptChange(template.value)}
                >
                  {template.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden pb-2 pr-1">
          <Textarea
            value={anomalyPrompt}
            onChange={(e) => onAnomalyPromptChange(e.target.value)}
            placeholder="描述你想要检测的异常类型..."
            className="cyber-scroll h-full min-h-[128px] max-h-full resize-none overflow-y-auto border-border/50 bg-input/50 px-3 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/85 focus:border-primary/50"
          />
        </div>
      </div>
    </div>
  )
}
