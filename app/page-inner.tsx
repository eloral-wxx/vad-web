"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Brain, Activity, PlayCircle } from "lucide-react"
import { VideoUpload } from "@/components/video-upload"
import { VideoPlayer } from "@/components/video-player"
import { TimelineChart } from "@/components/timeline-chart"
import { PromptPanel } from "@/components/prompt-panel"
import { SettingsDrawer } from "@/components/settings-drawer"
import { ResultPanel } from "@/components/result-panel"
import { AnalyzeButton } from "@/components/analyze-button"
import { Button } from "@/components/ui/button"
import type { DemoPresetDetail, DetectionResult, VideoFile, InferenceConfig, InferenceResponse, AnalysisStatus } from "@/lib/types"

const INFER_ENDPOINT = "/api/infer" // 前端反向代理
//const INFER_ENDPOINT = "http://39.106.114.117:8000/infer" // 阿里云服务器部署后端接口用的
// const INFER_ENDPOINT = "http://127.0.0.1:8000/infer" // 本地测试用的
const DEMO_PRESET_ENDPOINT = "/api/demo-presets"//原本是http://127.0.0.1:8000/demo-presets

export default function VideoAnomalyDetectionDemo() {
  const searchParams = useSearchParams()
  const demoId = searchParams.get("demo")?.trim() ?? ""
  const demoLoadRequestRef = useRef(0)
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
  const [errorMessage, setErrorMessage] = useState("")
  const [activeDemoId, setActiveDemoId] = useState("")
  
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
      if (
        previousVideo?.sourceType === "file" &&
        previousVideo.url.startsWith("blob:") &&
        previousVideo.url !== video?.url
      ) {
        URL.revokeObjectURL(previousVideo.url)
      }
      return video
    })

    setResult(null)
    setErrorMessage("")
    setCurrentTime(0)
    setDuration(0)
    setStatus("idle")
    setIsPlaying(false)
    setActiveDemoId("")
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

    setStatus("uploading")
    setIsPlaying(false)
    setCurrentTime(0)
    setResult(null)
    setErrorMessage("")

    try {
      // 关键修改：同时支持本地文件上传和视频 URL 提交，两种来源走同一个分析入口。
      const request =
        selectedVideo.sourceType === "url"
          ? {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                video_url: selectedVideo.url,
                anomaly_prompt: anomalyPrompt,
              }),
            }
          : (() => {
              const formData = new FormData()
              if (selectedVideo.file) {
                formData.append("file", selectedVideo.file)
              }
              formData.append("anomaly_prompt", anomalyPrompt)

              return {
                method: "POST",
                body: formData,
              }
            })()

      setStatus("analyzing")

      const response = await fetch(INFER_ENDPOINT, request)

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
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setStatus("error")
    }
  }, [anomalyPrompt, selectedVideo])

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const loadDemoPreset = useCallback(async (presetId: string) => {
    const requestId = ++demoLoadRequestRef.current

    setStatus("analyzing")
    setIsPlaying(false)
    setCurrentTime(0)
    setResult(null)
    setErrorMessage("")

    try {
      const response = await fetch(`${DEMO_PRESET_ENDPOINT}/${encodeURIComponent(presetId)}`)
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "detail" in payload
            ? String(payload.detail)
            : `Demo preset request failed with status ${response.status}`
        )
      }

      const demoPreset = normalizeDemoPresetDetail(payload)
      const normalizedResponse = demoPreset.result

      if (demoLoadRequestRef.current !== requestId) {
        return
      }

      setSelectedVideo({
        name: demoPreset.video_name,
        url: demoPreset.video_url,
        sourceType: "url",
      })
      setAnomalyPrompt(demoPreset.anomaly_prompt)
      setResult(normalizedResponse)
      setDuration(normalizedResponse.video_duration)
      setStatus("complete")
      setActiveDemoId(demoPreset.id)
    } catch (error) {
      if (demoLoadRequestRef.current !== requestId) {
        return
      }

      console.error("Demo preset load failed:", error)
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setStatus("error")
    }
  }, [])

  const handleStartDemo = useCallback(() => {
    void loadDemoPreset("building-explosion")
  }, [loadDemoPreset])

  useEffect(() => {
    if (!demoId) {
      setActiveDemoId("")
      return
    }

    void loadDemoPreset(demoId)
  }, [demoId, loadDemoPreset])

  // Update duration from result if available
  useEffect(() => {
    if (result?.video_duration) {
      setDuration(result.video_duration)
    }
  }, [result])

  const isAnalyzing = status === "uploading" || status === "analyzing"
  const canAnalyze = Boolean(selectedVideo && !isAnalyzing)
  const effectiveDuration = result?.video_duration || duration
  const isStreamingPageUrl = selectedVideo?.sourceType === "url" && !isDirectVideoUrl(selectedVideo.url)
  const bilibiliEmbedUrl = selectedVideo?.sourceType === "url" ? getBilibiliEmbedUrl(selectedVideo.url) : ""

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
            <Button
              type="button"
              variant="outline"
              onClick={handleStartDemo}
              disabled={isAnalyzing}
              className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
            >
              <PlayCircle className="h-4 w-4" />
              一键启动
            </Button>
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
              ) : isStreamingPageUrl && !activeDemoId ? (
                <div className="glass-panel neon-border flex h-[34vh] items-center justify-center rounded-xl p-6 text-center lg:h-[36vh]">
                  {bilibiliEmbedUrl ? (
                    <div className="flex h-full w-full flex-col gap-3">
                      <iframe
                        src={bilibiliEmbedUrl}
                        className="h-full w-full rounded-lg border border-border/50 bg-black"
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Bilibili video preview"
                      />
                      <p className="text-xs text-muted-foreground">
                        当前为 B 站嵌入预览。点击分析后，后端仍会单独解析并下载原视频做推理。
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-md space-y-3">
                      <p className="text-base font-medium text-foreground">已选择网页视频链接</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        这类链接无法直接在浏览器播放器中预览。点击分析后，后端会解析流媒体平台页面并下载实际视频文件进行推理。
                      </p>
                    </div>
                  )}
                </div>
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
                  {activeDemoId ? (
                    <span className="rounded-full border border-secondary/40 bg-secondary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-secondary">
                      Demo
                    </span>
                  ) : null}
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
              <div className="flex h-full flex-col gap-2">
                <AnalyzeButton
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  isLoading={isAnalyzing}
                  className="h-full"
                />
                {status === "error" && errorMessage ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {errorMessage}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-[68]">
              <ResultPanel
                result={result}
                isLoading={isAnalyzing}
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
  const normalizedClass = getResponseLabel(response)
  const topLevelDescription = getTextValue(response.description)
  const topLevelReason = getTextValue(response.reason)
  const fallbackTimeAxis = predictions.map((_, index) => {
    if (predictions.length <= 1) return 0
    return (index / (predictions.length - 1)) * videoDuration
  })
  const normalizedResults = normalizeResults(
    response.results,
    normalizedClass,
    topLevelDescription,
    topLevelReason
  )
  const primaryResult = normalizedResults[0]

  return {
    // 关键修改：兼容后端返回的 label/class，同时把顶层 description/reason 标准化，避免 normal 结果丢失。
    label: normalizedClass,
    class: normalizedClass,
    description: primaryResult?.description || topLevelDescription || "No description available",
    reason: primaryResult?.reason || topLevelReason || "No reason available",
    predictions,
    video_duration: videoDuration,
    time_axis: normalizeTimeAxis(response.time_axis, fallbackTimeAxis, predictions.length),
    results: normalizedResults,
    metadata: isObject(response.metadata)
      ? {
          confidence: toFiniteNumber(response.metadata.confidence),
          inference_time: toFiniteNumber(response.metadata.inference_time),
          tokens: toFiniteNumber(response.metadata.tokens),
        }
      : undefined,
  }
}

function normalizeDemoPresetDetail(payload: unknown): DemoPresetDetail {
  const response = isObject(payload) ? payload : {}

  return {
    id: getTextValue(response.id),
    title: getTextValue(response.title),
    description: getTextValue(response.description),
    video_name: getTextValue(response.video_name),
    video_url: getTextValue(response.video_url),
    anomaly_prompt: getTextValue(response.anomaly_prompt),
    result: normalizeInferenceResponse(response.result),
  }
}

function normalizeResults(
  results: unknown,
  fallbackClassName: string,
  fallbackDescription: string,
  fallbackReason: string
): DetectionResult[] {
  const normalizedResults = Array.isArray(results)
    ? results
    .filter(isObject)
    .map((result) => ({
      start: normalizeTimeValue(result.start),
      end: normalizeTimeValue(result.end),
      description: getTextValue(result.description) || fallbackDescription || "No description available",
      reason: getTextValue(result.reason) || fallbackReason || "No reason available",
      class_name: typeof result.class_name === "string" ? result.class_name : fallbackClassName,
    }))
    : []

  if (normalizedResults.length > 0) {
    return normalizedResults
  }

  // 关键修改：当后端没有返回结构化 results 时，回退到顶层 description/reason，始终保证前端有可展示内容。
  if (fallbackDescription || fallbackReason || fallbackClassName) {
    return [
      {
        start: normalizeTimeValue(""),
        end: normalizeTimeValue(""),
        description: fallbackDescription || "No description available",
        reason: fallbackReason || "No reason available",
        class_name: fallbackClassName,
      },
    ]
  }

  return []
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

function getResponseLabel(response: Record<string, any>): string {
  if (typeof response.label === "string" && response.label.trim()) {
    return response.label
  }

  if (typeof response.class === "string" && response.class.trim()) {
    return response.class
  }

  return ""
}

function getTextValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
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

function isDirectVideoUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    const path = parsed.pathname.toLowerCase()
    return [".mp4", ".avi", ".mov", ".mkv", ".webm"].some((suffix) => path.endsWith(suffix))
  } catch {
    return false
  }
}

function getBilibiliEmbedUrl(value: string): string {
  try {
    const parsed = new URL(value)
    const hostname = parsed.hostname.toLowerCase()
    if (!(hostname === "www.bilibili.com" || hostname.endsWith(".bilibili.com"))) {
      return ""
    }

    const match = parsed.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/i)
    if (!match) {
      return ""
    }

    return `https://player.bilibili.com/player.html?bvid=${match[1]}&page=1`
  } catch {
    return ""
  }
}
