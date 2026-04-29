"use client"

import { useMemo, useRef, useCallback, useState, useEffect } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { DetectionResult } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TimelineChartProps {
  predictions: number[]
  timeAxis?: number[]
  duration: number
  currentTime: number
  onSeek: (time: number) => void
  results?: DetectionResult[]
  className?: string
}

export function TimelineChart({
  predictions,
  timeAxis = [],
  duration,
  currentTime,
  onSeek,
  results = [],
  className
}: TimelineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [playheadTime, setPlayheadTime] = useState(0)

  const anomalyRegions = useMemo(() => {
    return results
      .map((result) => {
        const start = parseTimeString(result.start)
        const end = parseTimeString(result.end)
        return {
          start: Math.min(start, end),
          end: Math.max(start, end),
          className: result.class_name,
        }
      })
      .filter((region) => Number.isFinite(region.start) && Number.isFinite(region.end) && region.end >= region.start)
  }, [results])

  const data = useMemo(() => {
    if (predictions.length === 0) return []

    return predictions.map((score, index) => {
      const time = getTimeAxisValue(timeAxis, index, duration, predictions.length)
      const isAnomaly = anomalyRegions.some((region) => time >= region.start && time <= region.end)

      return {
        time,
        score,
        normalScore: isAnomaly ? null : score,
        anomalyScore: isAnomaly ? score : null,
        anomalyMask: isAnomaly ? 1 : null,
        formattedTime: formatTime(time),
        index,
      }
    })
  }, [predictions, timeAxis, duration, anomalyRegions])

  const chartRange = useMemo(() => {
    if (data.length === 0) {
      return { min: 0, max: duration > 0 ? duration : 1 }
    }

    const min = Number.isFinite(data[0]?.time) ? data[0].time : 0
    const lastTime = data[data.length - 1]?.time
    const maxCandidate = Number.isFinite(lastTime) ? lastTime : duration
    const max = maxCandidate > min ? maxCandidate : min + 1

    return { min, max }
  }, [data, duration])

  const playheadPercent = useMemo(() => {
    const span = chartRange.max - chartRange.min
    if (span <= 0) return 0
    const clamped = Math.max(chartRange.min, Math.min(playheadTime, chartRange.max))
    return ((clamped - chartRange.min) / span) * 100
  }, [chartRange, playheadTime])

  useEffect(() => {
    const clampedCurrentTime = Math.max(chartRange.min, Math.min(currentTime, chartRange.max))
    setPlayheadTime(clampedCurrentTime)
  }, [currentTime, chartRange])

  // Get time from mouse position
  const getTimeFromPosition = useCallback((clientX: number) => {
    const container = containerRef.current
    if (!container) return 0

    const rect = container.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return chartRange.min + ratio * (chartRange.max - chartRange.min)
  }, [chartRange])

  // Handle mouse/touch interactions on the timeline
  const handleInteractionStart = useCallback((clientX: number) => {
    setIsDragging(true)
    const time = getTimeFromPosition(clientX)
    setPlayheadTime(time)
    onSeek(time)
  }, [getTimeFromPosition, onSeek])

  const handleInteractionMove = useCallback((clientX: number) => {
    if (!isDragging) return
    const time = getTimeFromPosition(clientX)
    setPlayheadTime(time)
    onSeek(time)
  }, [isDragging, getTimeFromPosition, onSeek])

  const handleInteractionEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleInteractionStart(e.clientX)
  }, [handleInteractionStart])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleInteractionMove(e.clientX)
  }, [handleInteractionMove])

  const handleMouseUp = useCallback(() => {
    handleInteractionEnd()
  }, [handleInteractionEnd])

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleInteractionEnd()
    }
  }, [isDragging, handleInteractionEnd])

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleInteractionStart(e.touches[0].clientX)
    }
  }, [handleInteractionStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleInteractionMove(e.touches[0].clientX)
    }
  }, [handleInteractionMove])

  const handleTouchEnd = useCallback(() => {
    handleInteractionEnd()
  }, [handleInteractionEnd])

  // Chart click handler for precise seeking
  const handleChartClick = useCallback((data: { activePayload?: Array<{ payload: { time: number } }> }) => {
    if (data?.activePayload?.[0]?.payload) {
      const time = data.activePayload[0].payload.time
      setPlayheadTime(time)
      onSeek(time)
    }
  }, [onSeek])

  // Get current score for display
  const currentIndex = predictions.length > 0
    ? Math.min(
        Math.max(findClosestTimeIndex(data, playheadTime), 0),
        predictions.length - 1
      )
    : 0
  const currentScore = predictions[currentIndex] ?? 0

  if (data.length === 0) {
    return (
      <div className={cn("glass-panel neon-border flex h-full min-h-0 flex-col p-6", className)}>
        <h3 className="mb-4 flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          异常检测时间线
        </h3>
        
        {/* Empty state timeline bar */}
        <div 
          ref={containerRef}
          className="relative flex min-h-0 flex-1 items-center"
        >
          <div className="flex h-full min-h-[220px] w-full items-center justify-center rounded-lg border border-border/50 bg-muted/30">
            <p className="text-sm text-muted-foreground">等待分析结果...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("glass-panel neon-border flex h-full min-h-0 flex-col p-6", className)}>
      <h3 className="mb-4 flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
        <span className={cn(
          "w-2 h-2 rounded-full",
          currentScore > 0.5 ? "bg-destructive animate-pulse" : "bg-primary animate-pulse"
        )} />
        异常检测时间线
        <span className="ml-auto flex items-center gap-3">
          <span className={cn(
            "text-xs font-mono px-2 py-0.5 rounded",
            currentScore > 0.5 ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
          )}>
            分数: {currentScore.toFixed(3)}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </span>
      </h3>
      
      {/* Interactive Timeline */}
      <div 
        ref={containerRef}
        className={cn(
          "relative min-h-0 flex-1 cursor-pointer select-none",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            key={`${data.length}-${chartRange.min}-${chartRange.max}`}
            data={data}
            onClick={handleChartClick}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="scoreGradientNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.75 0.18 195)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="oklch(0.75 0.18 195)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="scoreGradientMuted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.75 0.18 195)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="oklch(0.75 0.18 195)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="anomalyOverlayGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.69 0.23 24)" stopOpacity={0.44} />
                <stop offset="100%" stopColor="oklch(0.69 0.23 24)" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            
            <XAxis 
              type="number"
              dataKey="time" 
              domain={[chartRange.min, chartRange.max]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'oklch(0.65 0.02 250)', fontSize: 10 }}
              tickFormatter={(value) => formatTime(value)}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[0, 1]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'oklch(0.65 0.02 250)', fontSize: 10 }}
              width={30}
              tickCount={3}
            />
            
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const score = payload[0].value as number
                  return (
                    <div className="glass-panel px-3 py-2 text-xs border border-border/50">
                      <p className="text-foreground">
                        时间: {formatTime(payload[0].payload.time)}
                      </p>
                      <p className={cn(
                        score > 0.5 ? "text-destructive" : "text-primary"
                      )}>
                        异常分数: {score.toFixed(3)}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />

            <Area
              type="monotone"
              dataKey="normalScore"
              stroke="oklch(0.75 0.18 195)"
              strokeWidth={2}
              fill="url(#scoreGradientNormal)"
              connectNulls={false}
              isAnimationActive={false}
            />

            <Area
              type="monotone"
              dataKey="anomalyScore"
              stroke="oklch(0.75 0.18 195)"
              strokeOpacity={0.35}
              strokeWidth={2}
              fill="url(#scoreGradientMuted)"
              connectNulls={false}
              isAnimationActive={false}
            />

            <Area
              type="stepAfter"
              dataKey="anomalyMask"
              stroke="none"
              fill="url(#anomalyOverlayGradient)"
              connectNulls={false}
              isAnimationActive={false}
            />
            
            {/* Playhead - vertical reference line */}
            <ReferenceLine 
              x={playheadTime}
              stroke="oklch(0.75 0.15 85)" 
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Custom playhead indicator overlay */}
        <div 
          className="absolute top-0 h-full pointer-events-none z-10"
          style={{ 
            left: `${playheadPercent}%`,
            transform: 'translateX(-50%)'
          }}
        >
          {/* Playhead line */}
          <div className="w-0.5 h-full bg-secondary glow-gold" />
          
          {/* Playhead handle */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-secondary border-2 border-background shadow-lg glow-gold" />
          
          {/* Time tooltip */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-secondary/90 text-secondary-foreground text-xs font-mono whitespace-nowrap">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
      
      {/* Progress bar for quick seeking */}
      <div className="relative mt-3 shrink-0">
        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
          {/* Anomaly regions on progress bar */}
          {anomalyRegions.map((region, index) => (
            <div
              key={index}
              className="absolute top-0 h-full bg-destructive/40 rounded-full"
              style={{
                left: `${duration > 0 ? (region.start / duration) * 100 : 0}%`,
                width: `${duration > 0 ? ((region.end - region.start) / duration) * 100 : 0}%`
              }}
            />
          ))}
          
          {/* Progress fill */}
          <div 
            className="h-full bg-primary/60 rounded-full transition-all duration-100"
            style={{ width: `${playheadPercent}%` }}
          />
        </div>
        
        {/* Progress handle */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-md glow-cyan transition-all duration-100 cursor-grab active:cursor-grabbing"
          style={{ left: `calc(${playheadPercent}% - 8px)` }}
        />
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex shrink-0 items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary/50" />
          <span className="text-muted-foreground">异常分数</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-destructive/50" />
          <span className="text-muted-foreground">检测到异常</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-secondary" />
          <span className="text-muted-foreground">播放位置</span>
        </div>
        <div className="ml-auto text-muted-foreground/70">
          点击或拖拽时间线跳转
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`
}

function parseTimeString(timeStr: string | number): number {
  if (typeof timeStr === "number") {
    return Number.isFinite(timeStr) ? timeStr : 0
  }

  const parts = timeStr.split(":")
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1])
  }
  return parseFloat(timeStr)
}

function getTimeAxisValue(timeAxis: number[], index: number, duration: number, predictionCount: number): number {
  const axisValue = timeAxis[index]
  if (Number.isFinite(axisValue)) {
    return axisValue
  }

  if (predictionCount <= 1) {
    return 0
  }

  return (index / (predictionCount - 1)) * duration
}

function findClosestTimeIndex(data: Array<{ time: number }>, targetTime: number): number {
  if (data.length === 0) return 0

  let closestIndex = 0
  let minDistance = Math.abs(data[0].time - targetTime)

  for (let index = 1; index < data.length; index += 1) {
    const distance = Math.abs(data[index].time - targetTime)
    if (distance < minDistance) {
      minDistance = distance
      closestIndex = index
    }
  }

  return closestIndex
}
