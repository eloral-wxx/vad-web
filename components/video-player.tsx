"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"

interface VideoPlayerProps {
  src: string
  currentTime: number
  onTimeUpdate: (time: number) => void
  isPlaying: boolean
  onPlayPause: () => void
  duration: number
  onDurationChange: (duration: number) => void
  onSeek?: (time: number) => void
  className?: string
}

export function VideoPlayer({
  src,
  currentTime,
  onTimeUpdate,
  isPlaying,
  onPlayPause,
  duration,
  onDurationChange,
  onSeek,
  className
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)

  // Handle video metadata load
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      onDurationChange(video.duration)
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    
    // If video is already loaded
    if (video.readyState >= 1) {
      onDurationChange(video.duration)
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
    }
  }, [onDurationChange, src])

  // Handle time updates with throttling
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let lastUpdate = 0
    const throttleMs = 100 // Update every 100ms max

    const handleTimeUpdate = () => {
      const now = Date.now()
      if (now - lastUpdate >= throttleMs && !isSeeking) {
        lastUpdate = now
        onTimeUpdate(video.currentTime)
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [onTimeUpdate, isSeeking])

  // Handle play/pause state
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isPlaying])

  // Sync video currentTime when external seek happens (e.g., from timeline)
  useEffect(() => {
    const video = videoRef.current
    if (!video || isSeeking) return

    // Only update if difference is significant (> 0.5s)
    if (Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime
    }
  }, [currentTime, isSeeking])

  const handleSeek = useCallback((value: number[]) => {
    const video = videoRef.current
    if (!video) return
    
    setIsSeeking(true)
    const newTime = value[0]
    video.currentTime = newTime
    onTimeUpdate(newTime)
    onSeek?.(newTime)
    
    // Small delay to prevent jitter
    setTimeout(() => setIsSeeking(false), 150)
  }, [onTimeUpdate, onSeek])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (video) {
      video.muted = !video.muted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }, [])

  const handleRestart = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    onTimeUpdate(0)
    onSeek?.(0)
  }, [onTimeUpdate, onSeek])

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    const ms = Math.floor((time % 1) * 10)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`
  }

  return (
    <div 
      ref={containerRef}
      className={cn("glass-panel neon-border group overflow-hidden", className)}
    >
      {/* Video container with proper aspect ratio handling */}
      <div className="relative w-full h-full flex items-center justify-center bg-background/80">
        <video
          ref={videoRef}
          src={src}
          className="max-w-full max-h-[50vh] w-auto h-auto object-contain rounded-md"
          playsInline
          style={{ aspectRatio: 'auto' }}
        />
        
        {/* Scanline overlay effect */}
        <div className="absolute inset-0 pointer-events-none scanline opacity-20" />
        
        {/* Center play button overlay */}
        {!isPlaying && (
          <button
            onClick={onPlayPause}
            className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-20 h-20 rounded-full bg-primary/30 flex items-center justify-center glow-cyan backdrop-blur-sm">
              <Play className="w-8 h-8 text-primary ml-1" />
            </div>
          </button>
        )}
        
        {/* Controls overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress bar */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&_[role=slider]]:bg-background [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-primary/30"
            />
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onPlayPause}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  "bg-primary/20 hover:bg-primary/30 glow-cyan"
                )}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-primary" />
                ) : (
                  <Play className="w-5 h-5 text-primary ml-0.5" />
                )}
              </button>
              
              <button
                onClick={handleRestart}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
              
              <button
                onClick={toggleMute}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              <div className="px-2 py-1 rounded bg-muted/50 border border-border/50">
                <span className="text-xs text-primary font-mono">
                  {formatTime(currentTime)}
                </span>
                <span className="text-xs text-muted-foreground font-mono"> / </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors"
            >
              <Maximize className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
