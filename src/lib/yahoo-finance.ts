import { LOOKBACK_MONTHS } from "@/data/config"
import { MARKET_STOCKS, NIFTY_TICKER } from "@/data/stocks"
import { monthEndsInRange, subtractMonths } from "@/lib/dates"

export type StockSeries = {
  id: string
  name: string
  ticker: string
  closes: (number | null)[]
}

export type MarketPricesResult = {
  dates: string[]
  stocks: StockSeries[]
  nifty: (number | null)[]
}

type ChartPayload = {
  timestamp: number[]
  adjClose: (number | null)[]
}

function datesInRange(from: string, to: string): string[] {
  const fetchFrom = subtractMonths(from, LOOKBACK_MONTHS)
  return monthEndsInRange(fetchFrom, to)
}

function rangeToUnix(from: string, to: string) {
  const fetchFrom = subtractMonths(from, LOOKBACK_MONTHS)
  const [fy, fm] = fetchFrom.split("-").map(Number)
  const period1 = Math.floor(new Date(fy, fm - 2, 1).getTime() / 1000)
  const [ty, tm, td] = to.split("-").map(Number)
  const period2 = Math.floor(new Date(ty, tm - 1, td).getTime() / 1000) + 86400
  return { period1, period2 }
}

export function sliceMarketWindow(
  data: MarketPricesResult,
  from: string,
  to: string,
): MarketPricesResult {
  const indices = data.dates
    .map((date, index) => ({ date, index }))
    .filter(({ date }) => date >= from && date <= to)
    .map(({ index }) => index)

  return {
    dates: indices.map((index) => data.dates[index]),
    stocks: data.stocks.map((stock) => ({
      ...stock,
      closes: indices.map((index) => stock.closes[index] ?? null),
    })),
    nifty: indices.map((index) => data.nifty[index] ?? null),
  }
}

function pickAdjClosesForDates(
  timestamps: number[],
  adjCloses: (number | null)[],
  targetDates: string[],
): (number | null)[] {
  return targetDates.map((targetDate) => {
    const targetEnd =
      Math.floor(new Date(`${targetDate}T23:59:59`).getTime() / 1000)
    let best: number | null = null
    for (let i = 0; i < timestamps.length; i++) {
      const adjClose = adjCloses[i]
      if (adjClose == null) continue
      if (timestamps[i] <= targetEnd) best = adjClose
    }
    return best
  })
}

async function fetchChart(
  ticker: string,
  period1: number,
  period2: number,
): Promise<ChartPayload> {
  const params = new URLSearchParams({
    path: `v8/finance/chart/${ticker}`,
    period1: String(period1),
    period2: String(period2),
    interval: "1d",
  })
  const url = `/api/yahoo?${params}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed for ${ticker} (${response.status})`)
  }

  const json = (await response.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[]
        indicators?: {
          adjclose?: Array<{ adjclose?: (number | null)[] }>
        }
      }>
      error?: { description?: string }
    }
  }

  const result = json.chart?.result?.[0]
  if (!result?.timestamp?.length) {
    const message = json.chart?.error?.description ?? `No data for ${ticker}`
    throw new Error(message)
  }

  const adjClose = result.indicators?.adjclose?.[0]?.adjclose
  if (!adjClose?.length) {
    throw new Error(`No adjusted close data for ${ticker}`)
  }

  return {
    timestamp: result.timestamp,
    adjClose,
  }
}

async function fetchSeries(
  ticker: string,
  period1: number,
  period2: number,
  targetDates: string[],
): Promise<(number | null)[]> {
  const chart = await fetchChart(ticker, period1, period2)
  return pickAdjClosesForDates(chart.timestamp, chart.adjClose, targetDates)
}

export async function fetchMarketPrices(
  from: string,
  to: string,
): Promise<MarketPricesResult> {
  const dates = datesInRange(from, to)
  if (dates.length === 0) {
    return { dates, stocks: [], nifty: [] }
  }

  const { period1, period2 } = rangeToUnix(from, to)
  const symbols = [...MARKET_STOCKS.map((stock) => stock.ticker), NIFTY_TICKER]

  const series = await Promise.all(
    symbols.map((ticker) => fetchSeries(ticker, period1, period2, dates)),
  )

  const stockSeries = MARKET_STOCKS.map((stock, index) => ({
    id: stock.id,
    name: stock.name,
    ticker: stock.ticker,
    closes: series[index] ?? [],
  }))

  return {
    dates,
    stocks: stockSeries,
    nifty: series[series.length - 1] ?? [],
  }
}
