"use client"

import { Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface AnalyzeButtonProps {
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

export function AnalyzeButton({ onClick, disabled, isLoading, className }: AnalyzeButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      size="lg"
      className={cn(
        "relative h-11 w-full overflow-hidden text-sm font-semibold",
        "bg-gradient-to-r from-primary to-primary/80",
        "hover:from-primary/90 hover:to-primary/70",
        "border border-primary/50",
        "transition-all duration-300",
        !disabled && !isLoading && "glow-cyan animate-pulse-glow",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <span className="relative z-10 flex items-center gap-2">
        {isLoading ? (
          <>
            <Spinner className="w-5 h-5" />
            <span>分析中...</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            <span>分析视频</span>
          </>
        )}
      </span>
      
      {/* Animated background */}
      {!disabled && !isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
      )}
    </Button>
  )
}
