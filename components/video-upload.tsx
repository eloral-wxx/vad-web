"use client"

import { useCallback, useState } from "react"
import { Upload, Film, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { VideoFile } from "@/lib/types"

interface VideoUploadProps {
  onVideoSelect: (video: VideoFile | null) => void
  selectedVideo: VideoFile | null
}

export function VideoUpload({ onVideoSelect, selectedVideo }: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

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
        url: URL.createObjectURL(file)
      })
    }
  }, [onVideoSelect])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onVideoSelect({
        file,
        name: file.name,
        url: URL.createObjectURL(file)
      })
    }
  }, [onVideoSelect])

  const handleRemove = useCallback(() => {
    if (selectedVideo) {
      URL.revokeObjectURL(selectedVideo.url)
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
              <p className="text-xs text-muted-foreground">已选择视频文件</p>
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
  )
}
