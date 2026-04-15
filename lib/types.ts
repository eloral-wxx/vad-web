// Backend API types for Video Anomaly Detection

export interface InferenceConfig {
  fps: number
  windowGop: number
  overlapGop: number
  blockGop?: number
  tokenCompression?: number
}

export interface DetectionResult {
  start: string | number
  end: string | number
  description: string
  reason: string
  class_name?: string
}

export interface InferenceMetadata {
  confidence: number
  inference_time: number
  tokens: number
}

export interface InferenceResponse {
  class: string
  predictions: number[]
  video_duration: number
  time_axis: number[]
  results: DetectionResult[]
  metadata?: InferenceMetadata
}

export interface VideoFile {
  file: File
  name: string
  url: string
}

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'
