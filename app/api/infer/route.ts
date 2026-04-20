export async function POST(req: Request) {
    try {
      const body = await req.json();
  
      console.log("🔥 Sending request to backend...");
  
      const res = await fetch("http://39.106.114.117:8000/infer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
  
      console.log("🔥 Backend status:", res.status);
  
      // 👇 不要直接 .json()
      const text = await res.text();
  
      console.log("🔥 Backend raw response:", text);
  
      return new Response(text, {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
  
    } catch (err) {
      console.error("❌ Proxy error:", err);
  
      return Response.json(
        { error: "Proxy failed", detail: String(err) },
        { status: 500 }
      );
    }
  }