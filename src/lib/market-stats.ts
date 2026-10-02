import { NIFTY_LABEL, NIFTY_TICKER } from "@/data/stocks"
import type { MarketPricesResult } from "@/lib/yahoo-finance"

export type ReturnStat = {
  id: string
  name: string
  ticker: string
  mean: number
  vol: number
}

function mean(values: number[]): number {
  let sum = 0
  for (let i = 0; i < values.length; i++) sum += values[i]
  return values.length === 0 ? 0 : sum / values.length
}

function sampleStdev(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const m = mean(values)
  let ss = 0
  for (let i = 0; i < n; i++) {
    const d = values[i] - m
    ss += d * d
  }
  return Math.sqrt(ss / (n - 1))
}

function simpleReturns(closes: (number | null)[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1]
    const curr = closes[i]
    if (prev == null || curr == null || prev === 0) continue
    returns.push(curr / prev - 1)
  }
  return returns
}

export function statFromCloses(
  id: string,
  name: string,
  ticker: string,
  closes: (number | null)[],
): ReturnStat {
  const returns = simpleReturns(closes)
  return {
    id,
    name,
    ticker,
    mean: mean(returns),
    vol: sampleStdev(returns),
  }
}

export function computeMarketStats(data: MarketPricesResult): ReturnStat[] {
  const stockStats = data.stocks.map((stock) =>
    statFromCloses(stock.id, stock.name, stock.ticker, stock.closes),
  )
  const niftyStat = statFromCloses("NIFTY", NIFTY_LABEL, NIFTY_TICKER, data.nifty)
  return [...stockStats, niftyStat]
}
