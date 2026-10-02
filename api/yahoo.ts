export const config = {
  runtime: "edge",
}

export default async function handler(request: Request) {
  const url = new URL(request.url)
  const pathParam = url.searchParams.get("path") ?? ""
  const query = new URLSearchParams(url.searchParams)
  query.delete("path")
  const search = query.toString()
  const target = `https://query1.finance.yahoo.com/${pathParam}${search ? `?${search}` : ""}`

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
