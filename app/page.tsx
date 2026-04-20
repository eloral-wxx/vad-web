"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Brain, Activity } from "lucide-react"
import { VideoUpload } from "@/components/video-upload"
import { VideoPlayer } from "@/components/video-player"
import { TimelineChart } from "@/components/timeline-chart"
import { PromptPanel } from "@/components/prompt-panel"
import { SettingsDrawer } from "@/components/settings-drawer"
import { ResultPanel } from "@/components/result-panel"
import { AnalyzeButton } from "@/components/analyze-button"
import type { DetectionResult, VideoFile, InferenceConfig, InferenceResponse, AnalysisStatus } from "@/lib/types"

 const INFER_ENDPOINT = "http://39.106.114.117:8000/infer" // 阿里云服务器部署后端接口用的
//const INFER_ENDPOINT = "http://127.0.0.1:8000/infer" // 本地测试用的

export default function VideoAnomalyDetectionDemo() {
  // Video state - single source of truth
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Ref to track if seeking is from timeline (to avoid circular updates)
  const isSeekingFromTimeline = useRef(false)
  
  // Analysis state
  const [status, setStatus] = useState<AnalysisStatus>("idle")
  const [result, setResult] = useState<InferenceResponse | null>(null)
  
  // Prompt state
  const [anomalyPrompt, setAnomalyPrompt] = useState("")
  
  // Config state
  const [config, setConfig] = useState<InferenceConfig>({
    fps: 2,
    windowGop: 16,
    overlapGop: 4,
    blockGop: 8,
    tokenCompression: 0.5
  })

  const handleVideoSelect = useCallback((video: VideoFile | null) => {
    setSelectedVideo((previousVideo) => {
      if (previousVideo?.url && previousVideo.url !== video?.url) {
        URL.revokeObjectURL(previousVideo.url)
      }
      return video
    })

    setResult(null)
    setCurrentTime(0)
    setDuration(0)
    setStatus("idle")
    setIsPlaying(false)
  }, [])

  // Handle video time update from video player
  const handleVideoTimeUpdate = useCallback((time: number) => {
    if (!isSeekingFromTimeline.current) {
      setCurrentTime(time)
    }
  }, [])

  // Handle seek from timeline chart
  const handleTimelineSeek = useCallback((time: number) => {
    isSeekingFromTimeline.current = true
    setCurrentTime(time)
    
    // Reset flag after a short delay
    setTimeout(() => {
      isSeekingFromTimeline.current = false
    }, 200)
  }, [])

  // Handle seek from video player progress bar
  const handleVideoSeek = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!selectedVideo) return

    setStatus("analyzing")
    setIsPlaying(false)
    setCurrentTime(0)
    setResult(null)

    const formData = new FormData()
    formData.append("file", selectedVideo.file)
    formData.append("anomaly_prompt", anomalyPrompt)

    try {
      const response = await fetch(INFER_ENDPOINT, {
        method: "POST",
        body: formData,
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "detail" in payload
            ? String(payload.detail)
            : `Inference request failed with status ${response.status}`
        )
      }

      const normalizedResponse = normalizeInferenceResponse(payload)
      setResult(normalizedResponse)
      setDuration(normalizedResponse.video_duration)
      setStatus("complete")
    } catch (error) {
      console.error("Video inference failed:", error)
      setStatus("error")
    }
  }, [anomalyPrompt, selectedVideo])

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  // Update duration from result if available
  useEffect(() => {
    if (result?.video_duration) {
      setDuration(result.video_duration)
    }
  }, [result])

  const canAnalyze = Boolean(selectedVideo && status !== "analyzing")
  const effectiveDuration = result?.video_duration || duration

  return (
    <div className="h-screen overflow-hidden bg-background cyber-grid">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      
      {/* Main content */}
      <div className="relative z-10 flex h-full flex-col p-4 lg:p-6">
        {/* Header */}
        <header className="mb-6 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center glow-cyan">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-secondary animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground text-glow-cyan">
                Video Anomaly Detection Demo
              </h1>
              <p className="text-sm text-muted-foreground">
                Multimodal Reasoning for Video Understanding
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">系统就绪</span>
            </div>
            <SettingsDrawer config={config} onConfigChange={setConfig} />
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:grid-rows-1">
          {/* Left Panel - Video & Timeline */}
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
            {/* Video Upload or Player */}
            <div className="shrink-0">
              {!selectedVideo ? (
                <VideoUpload
                  onVideoSelect={handleVideoSelect}
                  selectedVideo={selectedVideo}
                />
              ) : (
                <VideoPlayer
                  src={selectedVideo.url}
                  currentTime={currentTime}
                  onTimeUpdate={handleVideoTimeUpdate}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  duration={effectiveDuration}
                  onDurationChange={setDuration}
                  onSeek={handleVideoSeek}
                  className="h-[34vh] lg:h-[36vh]"
                />
              )}
            </div>
            
            {/* Timeline Chart */}
            <div className="min-h-0 flex-1">
              <TimelineChart
                predictions={result?.predictions || []}
                timeAxis={result?.time_axis || []}
                duration={effectiveDuration}
                currentTime={currentTime}
                onSeek={handleTimelineSeek}
                results={result?.results}
                className="h-full"
              />
            </div>
            
            {/* File info when video is selected */}
            {selectedVideo && (
              <div className="glass-panel neon-border p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-foreground truncate max-w-[200px]">
                    {selectedVideo.name}
                  </span>
                  {effectiveDuration > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({formatDuration(effectiveDuration)})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    handleVideoSelect(null)
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  更换视频
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - Controls & Results */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <div className="min-h-0 flex-[24]">
              <PromptPanel
                anomalyPrompt={anomalyPrompt}
                onAnomalyPromptChange={setAnomalyPrompt}
                className="h-full"
              />
            </div>

            <div className="min-h-[3.25rem] flex-[8]">
              <AnalyzeButton
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                isLoading={status === "analyzing"}
                className="h-full"
              />
            </div>

            <div className="min-h-0 flex-[68]">
              <ResultPanel
                result={result}
                isLoading={status === "analyzing"}
                className="h-full"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-4 shrink-0 text-center">
          <p className="text-xs text-muted-foreground/50">
            Powered by Multimodal AI • Research Prototype
          </p>
        </footer>
      </div>
    </div>
  )
}

function normalizeInferenceResponse(payload: unknown): InferenceResponse {
  const response = isObject(payload) ? payload : {}
  const predictions = toNumberArray(response.predictions)
  const videoDuration = toFiniteNumber(response.video_duration)
  const fallbackTimeAxis = predictions.map((_, index) => {
    if (predictions.length <= 1) return 0
    return (index / (predictions.length - 1)) * videoDuration
  })

  return {
    class: typeof response.class === "string" ? response.class : "",
    predictions,
    video_duration: videoDuration,
    time_axis: normalizeTimeAxis(response.time_axis, fallbackTimeAxis, predictions.length),
    results: normalizeResults(response.results, typeof response.class === "string" ? response.class : ""),
    metadata: isObject(response.metadata)
      ? {
          confidence: toFiniteNumber(response.metadata.confidence),
          inference_time: toFiniteNumber(response.metadata.inference_time),
          tokens: toFiniteNumber(response.metadata.tokens),
        }
      : undefined,
  }
}

function normalizeResults(results: unknown, fallbackClassName: string): DetectionResult[] {
  if (!Array.isArray(results)) return []

  return results
    .filter(isObject)
    .map((result) => ({
      start: normalizeTimeValue(result.start),
      end: normalizeTimeValue(result.end),
      description: typeof result.description === "string" ? result.description : "",
      reason: typeof result.reason === "string" ? result.reason : "",
      class_name: typeof result.class_name === "string" ? result.class_name : fallbackClassName,
    }))
}

function normalizeTimeAxis(timeAxis: unknown, fallbackTimeAxis: number[], expectedLength: number): number[] {
  if (!Array.isArray(timeAxis)) {
    return fallbackTimeAxis
  }

  const normalizedTimeAxis = timeAxis
    .map((value) => toFiniteNumber(value))
    .slice(0, expectedLength)

  if (normalizedTimeAxis.length === expectedLength) {
    return normalizedTimeAxis
  }

  return fallbackTimeAxis
}

function normalizeTimeValue(value: unknown): string | number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    return value
  }

  return 0
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => toFiniteNumber(entry))
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
