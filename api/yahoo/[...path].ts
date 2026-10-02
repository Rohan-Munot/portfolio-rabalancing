export const config = {
  runtime: "edge",
}

export default async function (request: Request): Promise<Response> {
  const url = new URL(request.url)
  const yahooPath = url.pathname.replace(/^\/api\/yahoo\/?/, "")

  if (!yahooPath) {
    return Response.json({ error: "Missing Yahoo path" }, { status: 400 })
  }

  const target = `https://query1.finance.yahoo.com/${yahooPath}${url.search}`

  const response = await fetch(target, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; portfolio-rabalancing/1.0)",
    },
  })

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
