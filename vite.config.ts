import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import type { IncomingMessage, ServerResponse } from "node:http"
import { defineConfig, type Connect, type PreviewServer, type ViteDevServer } from "vite"

async function handleYahooProxy(
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
) {
  if (!req.url?.startsWith("/api/yahoo")) return next()

  const url = new URL(req.url, "http://localhost")
  if (url.pathname !== "/api/yahoo") return next()

  const yahooPath = url.searchParams.get("path")
  if (!yahooPath) {
    res.statusCode = 400
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ error: "Missing Yahoo path" }))
    return
  }

  const query = new URLSearchParams(url.searchParams)
  query.delete("path")
  const search = query.toString()
  const target = `https://query1.finance.yahoo.com/${yahooPath}${search ? `?${search}` : ""}`

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; portfolio-rabalancing/1.0)",
      },
    })
    res.statusCode = response.status
    res.setHeader(
      "Content-Type",
      response.headers.get("Content-Type") ?? "application/json",
    )
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    next(error)
  }
}

function yahooProxyPlugin() {
  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(handleYahooProxy)
  }

  return {
    name: "yahoo-proxy",
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), yahooProxyPlugin()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
})
