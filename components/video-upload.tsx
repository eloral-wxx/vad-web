"use client"

import { useCallback, useMemo, useState } from "react"
import { Upload, Film, Link2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { VideoFile } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface VideoUploadProps {
  onVideoSelect: (video: VideoFile | null) => void
  selectedVideo: VideoFile | null
}

export function VideoUpload({ onVideoSelect, selectedVideo }: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const trimmedVideoUrl = useMemo(() => videoUrl.trim(), [videoUrl])
  const isStreamingPageUrl = useMemo(() => {
    if (!selectedVideo || selectedVideo.sourceType !== "url") return false

    try {
      const parsed = new URL(selectedVideo.url)
      const pathname = parsed.pathname.toLowerCase()
      return !pathname.endsWith(".mp4") && !pathname.endsWith(".avi") && !pathname.endsWith(".mov") && !pathname.endsWith(".mkv") && !pathname.endsWith(".webm")
    } catch {
      return false
    }
  }, [selectedVideo])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && (file.type === "video/mp4" || file.type === "video/x-msvideo" || file.name.endsWith('.avi'))) {
      onVideoSelect({
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        sourceType: "file",
      })
    }
  }, [onVideoSelect])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onVideoSelect({
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        sourceType: "file",
      })
    }
  }, [onVideoSelect])

  const handleUrlSubmit = useCallback(() => {
    if (!trimmedVideoUrl) return

    // 关键修改：新增 URL 视频选择入口，提交后与本地文件共用同一套分析状态。
    const nameFromUrl = trimmedVideoUrl.split("/").filter(Boolean).pop() || "Remote video"
    onVideoSelect({
      name: nameFromUrl,
      url: trimmedVideoUrl,
      sourceType: "url",
    })
  }, [onVideoSelect, trimmedVideoUrl])

  const handleRemove = useCallback(() => {
    if (selectedVideo) {
      if (selectedVideo.sourceType === "file" && selectedVideo.url.startsWith("blob:")) {
        URL.revokeObjectURL(selectedVideo.url)
      }
      onVideoSelect(null)
    }
  }, [selectedVideo, onVideoSelect])

  if (selectedVideo) {
    return (
      <div className="glass-panel p-4 neon-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{selectedVideo.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedVideo.sourceType === "url"
                  ? isStreamingPageUrl
                    ? "已选择视频网页链接，分析时将由后端解析并下载"
                    : "已选择视频 URL"
                  : "已选择视频文件"}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center hover:bg-destructive/30 transition-colors"
          >
            <X className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "glass-panel border-2 border-dashed rounded-lg p-8 transition-all duration-300 cursor-pointer group",
          isDragging 
            ? "border-primary bg-primary/10 glow-cyan" 
            : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
        )}
      >
        <label className="flex flex-col items-center justify-center cursor-pointer">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300",
            isDragging 
              ? "bg-primary/30 glow-cyan" 
              : "bg-primary/10 group-hover:bg-primary/20"
          )}>
            <Upload className={cn(
              "w-8 h-8 transition-colors",
              isDragging ? "text-primary" : "text-primary/70 group-hover:text-primary"
            )} />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            拖拽视频文件到此处
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            或点击选择文件
          </p>
          <p className="text-xs text-primary/70">
            支持格式: MP4, AVI
          </p>
          <input
            type="file"
            accept="video/mp4,video/x-msvideo,.mp4,.avi"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      <div className="glass-panel neon-border rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/15">
            <Link2 className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">视频 URL</p>
            <p className="text-xs text-muted-foreground">支持直链视频 URL，也支持 B 站等流媒体平台的视频网页链接</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://example.com/demo.mp4 或 https://www.bilibili.com/video/BV..."
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleUrlSubmit}
            disabled={!trimmedVideoUrl}
            className="shrink-0"
          >
            Submit URL
          </Button>
        </div>
      </div>
    </div>
  )
}
