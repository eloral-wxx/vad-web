export async function POST(req: Request) {
    try {
      const body = await req.json();
  
      const res = await fetch("http://39.106.114.117:8000/infer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
  
      const data = await res.json();
  
      return Response.json(data);
    } catch (err) {
      return Response.json(
        { error: "Proxy request failed", detail: String(err) },
        { status: 500 }
      );
    }
  }