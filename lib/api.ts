const DEFAULT_API_BASE = "/api"

function normalizeApiBase(input: string | undefined): string {
  const value = (input || DEFAULT_API_BASE).trim()

  if (!value || value === "/") {
    return ""
  }

  return value.endsWith("/") ? value.slice(0, -1) : value
}

export const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE)
export const INFER_ENDPOINT = `${API_BASE}/infer`
export const DEMO_PRESET_ENDPOINT = `${API_BASE}/demo-presets`
