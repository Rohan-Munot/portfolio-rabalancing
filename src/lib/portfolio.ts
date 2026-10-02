import { LOOKBACK_MONTHS, RISK_FREE } from "@/data/config"
import { MARKET_STOCKS, type AssetId } from "@/data/stocks"
import type { MarketPricesResult } from "@/lib/yahoo-finance"

export type Metrics = {
  cagr: number
  vol: number
  sharpe: number
  maxDrawdown: number
  end: number
}

export type Allocation = {
  id: AssetId
  name: string
  ticker: string
  weight: number
  rupees: number
}

export type ReturnRow = {
  date: string
  nifty: number
  assets: number[]
}

export type PriceRow = {
  date: string
  assets: (number | null)[]
  nifty: number | null
}

export type RunInput = {
  amount: number
  from: string
  to: string
  market: MarketPricesResult
}

export type RunResult = {
  amount: number
  from: string
  to: string
  assetIds: AssetId[]
  prices: PriceRow[]
  returns: ReturnRow[]
  stats: { id: AssetId; name: string; ticker: string; mean: number; vol: number }[]
  cov: number[][]
  staticWeights: number[]
  variance: number
  stdev: number
  expectedMonthly: number
  allocations: Allocation[]
  monthlyWeights: { date: string; weights: number[] }[]
  path: { date: string; optimized: number; equal: number; nifty: number }[]
  metrics: { optimized: Metrics; equal: Metrics; nifty: Metrics }
  equalEnd: number
  firstRebalance: string | null
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

function invert(matrix: number[][]): number[][] | null {
  const n = matrix.length
  const a: number[][] = Array.from({ length: n }, (_, i) => {
    const row = matrix[i].slice()
    for (let j = 0; j < n; j++) row.push(i === j ? 1 : 0)
    return row
  })

  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r
    }
    if (Math.abs(a[pivot][col]) < 1e-14) return null
    const swap = a[col]
    a[col] = a[pivot]
    a[pivot] = swap
    const div = a[col][col]
    for (let j = 0; j < 2 * n; j++) a[col][j] /= div
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = a[r][col]
      if (f === 0) continue
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j]
    }
  }

  return a.map((row) => row.slice(n))
}

function ridgeInvert(sigma: number[][]): number[][] {
  const n = sigma.length
  let avgDiag = 0
  for (let i = 0; i < n; i++) avgDiag += sigma[i][i]
  avgDiag = avgDiag / n || 1
  let lambda = 1e-8 * avgDiag
  for (let k = 0; k < 8; k++) {
    const shifted = sigma.map((row, i) =>
      row.map((value, j) => value + (i === j ? lambda : 0)),
    )
    const inv = invert(shifted)
    if (inv) return inv
    lambda *= 10
  }
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  )
}

function covariance(series: number[][]): number[][] {
  const t = series.length
  const n = series[0]?.length ?? 0
  const means = Array.from({ length: n }, (_, j) => {
    let sum = 0
    for (let i = 0; i < t; i++) sum += series[i][j]
    return t === 0 ? 0 : sum / t
  })
  const cov = Array.from({ length: n }, () => Array(n).fill(0))
  if (t < 2) return cov
  const denom = t - 1
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let ss = 0
      for (let k = 0; k < t; k++) {
        ss += (series[k][i] - means[i]) * (series[k][j] - means[j])
      }
      const value = ss / denom
      cov[i][j] = value
      cov[j][i] = value
    }
  }
  return cov
}

function gmv(sigma: number[][]): number[] {
  const n = sigma.length
  if (n === 0) return []
  let active = Array.from({ length: n }, (_, i) => i)

  for (let guard = 0; guard < n; guard++) {
    const sub = active.map((i) => active.map((j) => sigma[i][j]))
    const inv = ridgeInvert(sub)
    const rowSums = inv.map((row) => {
      let sum = 0
      for (let j = 0; j < row.length; j++) sum += row[j]
      return sum
    })
    let denom = 0
    for (let i = 0; i < rowSums.length; i++) denom += rowSums[i]
    const wActive =
      denom === 0
        ? rowSums.map(() => 1 / rowSums.length)
        : rowSums.map((value) => value / denom)

    const drop: number[] = []
    for (let k = 0; k < wActive.length; k++) {
      if (wActive[k] < -1e-10) drop.push(k)
    }
    if (drop.length === 0) {
      const weights = Array(n).fill(0)
      let sum = 0
      for (let k = 0; k < active.length; k++) {
        const value = Math.max(0, wActive[k])
        weights[active[k]] = value
        sum += value
      }
      if (sum === 0) return Array(n).fill(1 / n)
      for (let i = 0; i < n; i++) weights[i] /= sum
      return weights
    }

    const dropSet = new Set(drop)
    active = active.filter((_, k) => !dropSet.has(k))
    if (active.length === 0) return Array(n).fill(1 / n)
  }

  return Array(n).fill(1 / n)
}

function portfolioVariance(weights: number[], sigma: number[][]): number {
  let value = 0
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      value += weights[i] * weights[j] * sigma[i][j]
    }
  }
  return value
}

function dot(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

function buildReturns(market: MarketPricesResult): ReturnRow[] {
  const out: ReturnRow[] = []
  for (let i = 1; i < market.dates.length; i++) {
    const assets: number[] = []
    let valid = true
    for (const stock of market.stocks) {
      const prev = stock.closes[i - 1]
      const curr = stock.closes[i]
      if (prev == null || curr == null || prev === 0) {
        valid = false
        break
      }
      assets.push(curr / prev - 1)
    }
    const prevNifty = market.nifty[i - 1]
    const currNifty = market.nifty[i]
    if (
      !valid ||
      prevNifty == null ||
      currNifty == null ||
      prevNifty === 0
    ) {
      continue
    }
    out.push({
      date: market.dates[i],
      nifty: currNifty / prevNifty - 1,
      assets,
    })
  }
  return out
}

function buildPriceRows(
  market: MarketPricesResult,
  from: string,
  to: string,
): PriceRow[] {
  return market.dates
    .map((date, index) => ({ date, index }))
    .filter(({ date }) => date >= from && date <= to)
    .map(({ date, index }) => ({
      date,
      assets: market.stocks.map((stock) => stock.closes[index] ?? null),
      nifty: market.nifty[index] ?? null,
    }))
}

function metricsFromWealth(values: number[], start: number, rf: number): Metrics {
  const end = values[values.length - 1] ?? start
  const n = values.length
  if (n === 0) {
    return { cagr: 0, vol: 0, sharpe: 0, maxDrawdown: 0, end: start }
  }

  const monthly: number[] = []
  let prev = start
  let peak = start
  let maxDd = 0
  for (let i = 0; i < n; i++) {
    const v = values[i]
    monthly.push(v / prev - 1)
    if (v > peak) peak = v
    const dd = v / peak - 1
    if (dd < maxDd) maxDd = dd
    prev = v
  }

  const cagr = (end / start) ** (12 / n) - 1
  const vol = sampleStdev(monthly) * Math.sqrt(12)
  const sharpe = vol === 0 ? 0 : (cagr - rf) / vol
  return { cagr, vol, sharpe, maxDrawdown: maxDd, end }
}

function clampRange(from: string, to: string): { from: string; to: string } {
  let start = from
  let end = to
  if (start > end) {
    const swap = start
    start = end
    end = swap
  }
  return { from: start, to: end }
}

export function runPortfolio(input: RunInput): RunResult {
  const amount = Number.isFinite(input.amount) && input.amount > 0 ? input.amount : 0
  const { from, to } = clampRange(input.from, input.to)
  const ids = MARKET_STOCKS.map((asset) => asset.id)
  const allReturns = buildReturns(input.market)
  const windowReturns = allReturns.filter((row) => row.date >= from && row.date <= to)
  const windowPrices = buildPriceRows(input.market, from, to)

  const stats = ids.map((id, j) => {
    const series = windowReturns.map((row) => row.assets[j])
    const asset = MARKET_STOCKS[j]
    return {
      id,
      name: asset.name,
      ticker: asset.ticker,
      mean: mean(series),
      vol: sampleStdev(series),
    }
  })

  const cov = covariance(windowReturns.map((row) => row.assets))
  const staticWeights = windowReturns.length >= 2 ? gmv(cov) : ids.map(() => 1 / ids.length)
  const variance = portfolioVariance(staticWeights, cov)
  const stdev = Math.sqrt(Math.max(0, variance))
  const expectedMonthly = dot(
    staticWeights,
    stats.map((row) => row.mean),
  )
  const allocations: Allocation[] = ids.map((id, j) => ({
    id,
    name: MARKET_STOCKS[j].name,
    ticker: MARKET_STOCKS[j].ticker,
    weight: staticWeights[j],
    rupees: amount * staticWeights[j],
  }))

  const n = ids.length
  const equalW = Array(n).fill(1 / n)
  let equalWindow = amount
  for (let i = 0; i < windowReturns.length; i++) {
    equalWindow *= 1 + dot(equalW, windowReturns[i].assets)
  }

  const monthlyWeights: { date: string; weights: number[] }[] = []
  const path: { date: string; optimized: number; equal: number; nifty: number }[] = []

  let opt = amount
  let eq = amount
  let nifty = amount
  let firstRebalance: string | null = null
  let invested = false
  let niftyBase = 0

  for (let t = 0; t < allReturns.length; t++) {
    const row = allReturns[t]
    if (row.date < from || row.date > to) continue

    const history = allReturns.slice(0, t)
    if (history.length < LOOKBACK_MONTHS) continue

    if (!invested) {
      const prevReturn = allReturns[t - 1]
      const prevIndex = input.market.dates.indexOf(prevReturn?.date ?? "")
      niftyBase = prevIndex >= 0 ? input.market.nifty[prevIndex] ?? 0 : 0
      firstRebalance = row.date
      invested = true
    }

    const histCov = covariance(history.map((item) => item.assets))
    const weights = gmv(histCov)
    monthlyWeights.push({ date: row.date, weights })

    opt *= 1 + dot(weights, row.assets)
    eq *= 1 + dot(equalW, row.assets)

    const priceIndex = input.market.dates.indexOf(row.date)
    const priceNow = priceIndex >= 0 ? input.market.nifty[priceIndex] : null
    nifty = niftyBase === 0 || priceNow == null ? amount : amount * (priceNow / niftyBase)

    path.push({ date: row.date, optimized: opt, equal: eq, nifty })
  }

  const optPath = path.map((p) => p.optimized)
  const eqPath = path.map((p) => p.equal)
  const niftyPath = path.map((p) => p.nifty)

  return {
    amount,
    from,
    to,
    assetIds: ids,
    prices: windowPrices,
    returns: windowReturns,
    stats,
    cov,
    staticWeights,
    variance,
    stdev,
    expectedMonthly,
    allocations,
    monthlyWeights,
    path,
    metrics: {
      optimized: metricsFromWealth(optPath, amount, RISK_FREE),
      equal: metricsFromWealth(eqPath, amount, RISK_FREE),
      nifty: metricsFromWealth(niftyPath, amount, RISK_FREE),
    },
    equalEnd: equalWindow,
    firstRebalance,
  }
}

export function selfCheck(): string[] {
  const errors: string[] = []
  const close = (actual: number, expected: number, eps: number, label: string) => {
    if (Math.abs(actual - expected) > eps) {
      errors.push(`${label}: ${actual} vs ${expected}`)
    }
  }

  const series = [
    [0.01, -0.02, 0.015],
    [0.02, 0.01, -0.005],
    [-0.01, 0.03, 0.02],
  ]
  const weights = gmv(covariance(series))
  const weightSum = weights.reduce((a, b) => a + b, 0)
  close(weightSum, 1, 1e-9, "gmv weights sum")
  for (const weight of weights) {
    if (weight < -1e-10) errors.push(`negative gmv weight ${weight}`)
  }

  const wealth = metricsFromWealth([110000, 115000, 120000], 100000, RISK_FREE)
  if (wealth.end !== 120000) errors.push(`wealth end ${wealth.end}`)

  return errors
}
