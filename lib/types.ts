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
  label: string
  class: string
  description: string
  reason: string
  predictions: number[]
  video_duration: number
  time_axis: number[]
  results: DetectionResult[]
  metadata?: InferenceMetadata
}

export interface VideoFile {
  file?: File
  name: string
  url: string
  sourceType: "file" | "url"
}

export interface DemoPresetSummary {
  id: string
  title: string
  description: string
}

export interface DemoPresetDetail extends DemoPresetSummary {
  video_name: string
  video_url: string
  anomaly_prompt: string
  result: InferenceResponse
}

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'
