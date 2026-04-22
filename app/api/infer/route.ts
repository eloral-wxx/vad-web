export const runtime = "nodejs"

const BACKEND_INFER_URL = "http://39.106.114.117:8000/infer"

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json()

    console.log("[/api/infer] Received body:", body)

    const backendResponse = await fetch(BACKEND_INFER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const backendText = await backendResponse.text()

    console.log("[/api/infer] Backend status:", backendResponse.status)
    console.log("[/api/infer] Backend response:", backendText)

    return new Response(backendText, {
      status: backendResponse.status,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("[/api/infer] Proxy error:", error)

    const message = error instanceof Error ? error.message : String(error)

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}
