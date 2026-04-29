"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Brain, Activity } from "lucide-react"
import { VideoUpload } from "@/components/video-upload"
import { VideoPlayer } from "@/components/video-player"
import { TimelineChart } from "@/components/timeline-chart"
import { PromptPanel } from "@/components/prompt-panel"
import { SettingsDrawer } from "@/components/settings-drawer"
import { ResultPanel } from "@/components/result-panel"
import { AnalyzeButton } from "@/components/analyze-button"
import { DEMO_PRESET_ENDPOINT, INFER_ENDPOINT } from "@/lib/api"
import type { DemoPresetDetail, DetectionResult, VideoFile, InferenceConfig, InferenceResponse, AnalysisStatus } from "@/lib/types"

export function HomePage() {
  const searchParams = useSearchParams()
  const demoId = searchParams.get("demo")?.trim() ?? ""
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const isSeekingFromTimeline = useRef(false)
  const [status, setStatus] = useState<AnalysisStatus>("idle")
  const [result, setResult] = useState<InferenceResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [activeDemoId, setActiveDemoId] = useState("")
  const [anomalyPrompt, setAnomalyPrompt] = useState("")
  const [config, setConfig] = useState<InferenceConfig>({
    fps: 2,
    windowGop: 16,
    overlapGop: 4,
    blockGop: 8,
    tokenCompression: 0.5,
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

  const handleVideoTimeUpdate = useCallback((time: number) => {
    if (!isSeekingFromTimeline.current) {
      setCurrentTime(time)
    }
  }, [])

  const handleTimelineSeek = useCallback((time: number) => {
    isSeekingFromTimeline.current = true
    setCurrentTime(time)

    setTimeout(() => {
      isSeekingFromTimeline.current = false
    }, 200)
  }, [])

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
    setIsPlaying((prev) => !prev)
  }, [])

  useEffect(() => {
    if (!demoId) {
      setActiveDemoId("")
      return
    }

    let cancelled = false

    async function loadDemoPreset() {
      setStatus("analyzing")
      setIsPlaying(false)
      setCurrentTime(0)
      setResult(null)
      setErrorMessage("")

      try {
        const response = await fetch(`${DEMO_PRESET_ENDPOINT}/${encodeURIComponent(demoId)}`)
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

        if (cancelled) {
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
        if (cancelled) {
          return
        }

        console.error("Demo preset load failed:", error)
        setErrorMessage(error instanceof Error ? error.message : String(error))
        setStatus("error")
      }
    }

    void loadDemoPreset()

    return () => {
      cancelled = true
    }
  }, [demoId])

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
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />

      <div className="relative z-10 flex h-full flex-col p-4 lg:p-6">
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

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:grid-rows-1">
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
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

  return ""
}

function getResponseLabel(response: Record<string, unknown>): string {
  const candidates = [response.class, response.label, response.class_name]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate
    }
  }

  return "normal"
}

function getTextValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => toFiniteNumber(item))
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "00:00"
  }

  const totalSeconds = Math.floor(seconds)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

function isDirectVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname.toLowerCase()
    return [".mp4", ".avi", ".mov", ".mkv", ".webm"].some((suffix) => pathname.endsWith(suffix))
  } catch {
    return false
  }
}

function getBilibiliEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url)

    if (!parsed.hostname.includes("bilibili.com")) {
      return ""
    }

    const match = parsed.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/)
    if (!match) {
      return ""
    }

    return `https://player.bilibili.com/player.html?bvid=${match[1]}&page=1`
  } catch {
    return ""
  }
}
