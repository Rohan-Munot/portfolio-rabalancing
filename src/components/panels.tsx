import { useMemo, type ReactNode } from "react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LOOKBACK_MONTHS, RISK_FREE } from "@/data/config"
import { MARKET_STOCKS } from "@/data/stocks"
import { inr, monthLabel, number, pct } from "@/lib/format"
import { computeMarketStats } from "@/lib/market-stats"
import type { RunResult } from "@/lib/portfolio"
import type { MarketPricesResult } from "@/lib/yahoo-finance"

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] font-normal tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
    </div>
  )
}

type MarketQuery = {
  data: MarketPricesResult | null
  loading: boolean
  error: string | null
}

export function RawPanel({
  result,
  market,
}: {
  result: RunResult
  market: MarketQuery
}) {
  const ids = result.assetIds
  const stats = useMemo(
    () => (market.data ? computeMarketStats(market.data) : null),
    [market.data],
  )

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Month-end adjusted closes and simple returns
          {" "}
          <span className="text-foreground">(Pₜ / Pₜ₋₁ − 1)</span>
          . Ten Nifty names from Yahoo Finance.
        </p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm text-muted-foreground">
            Equal-weight 1/{ids.length} on this window ends at
          </p>
          <p className="font-mono text-3xl leading-none tabular-nums tracking-tight sm:text-4xl">
            {inr(result.equalEnd)}
          </p>
        </div>
      </div>

      <section className="grid gap-3">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          Mean monthly return and volatility
        </h2>
        {market.loading ? (
          <p className="text-sm text-muted-foreground">Loading stats from Yahoo Finance…</p>
        ) : market.error ? (
          <p className="text-sm text-destructive">{market.error}</p>
        ) : stats ? (
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase hover:bg-transparent">
                <TableHead className="h-auto py-2 pr-4">Name</TableHead>
                <TableHead className="h-auto py-2 pr-4">Ticker</TableHead>
                <TableHead className="h-auto py-2 pr-4 text-right">Avg return</TableHead>
                <TableHead className="h-auto py-2 text-right">Stdev</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="py-2 pr-4">{row.name}</TableCell>
                  <TableCell className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                    {row.ticker}
                  </TableCell>
                  <TableCell className="py-2 pr-4 text-right tabular-nums">{pct(row.mean)}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums">{pct(row.vol)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No price data for the selected range.</p>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          Monthly returns
        </h2>
        <Table className="min-w-[64rem] text-xs">
          <TableHeader>
            <TableRow className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase hover:bg-transparent">
              <TableHead className="h-auto py-2 pr-3">Month</TableHead>
              {MARKET_STOCKS.map((asset) => (
                <TableHead key={asset.id} className="h-auto py-2 pr-3 text-right">
                  {asset.id}
                </TableHead>
              ))}
              <TableHead className="h-auto py-2 text-right">Nifty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.returns.map((row) => (
              <TableRow key={row.date}>
                <TableCell className="py-1.5 pr-3 tabular-nums">{monthLabel(row.date)}</TableCell>
                {row.assets.map((value, i) => (
                  <TableCell key={ids[i]} className="py-1.5 pr-3 text-right tabular-nums">
                    {pct(value)}
                  </TableCell>
                ))}
                <TableCell className="py-1.5 text-right tabular-nums">{pct(row.nifty)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}

export function OptimizationsPanel({ result }: { result: RunResult }) {
  const n = result.assetIds.length
  let maxAbs = 0
  for (const row of result.cov) {
    for (const value of row) {
      const abs = Math.abs(value)
      if (abs > maxAbs) maxAbs = abs
    }
  }

  return (
    <div className="grid gap-8">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Global minimum variance for the selected window: minimize{" "}
        <span className="text-foreground">w′Σw</span> with weights summing to 100%
        and no shorts.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Variance" value={result.variance.toFixed(6)} />
        <MetricCard label="Monthly stdev" value={pct(result.stdev)} />
        <MetricCard label="Expected monthly" value={pct(result.expectedMonthly)} />
      </div>

      <section className="grid gap-3">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          One-shot allocation of {inr(result.amount)}
        </h2>
        <ul className="grid gap-2">
          {result.allocations
            .slice()
            .sort((a, b) => b.weight - a.weight)
            .map((row) => (
              <li key={row.id} className="grid grid-cols-[11rem_minmax(0,1fr)_4.5rem_7.5rem] items-center gap-3 text-sm">
                <span>{row.name}</span>
                <Progress
                  value={Math.max(0, row.weight * 100)}
                  className="gap-0 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-indicator]]:bg-foreground"
                />
                <span className="text-right tabular-nums">{pct(row.weight)}</span>
                <span className="text-right tabular-nums">{inr(row.rupees)}</span>
              </li>
            ))}
        </ul>
      </section>

      <section className="grid gap-3">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          Sample covariance
        </h2>
        <Table className="min-w-[40rem] text-[11px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-auto p-1" />
              {result.assetIds.map((id) => (
                <TableHead key={id} className="h-auto p-1 text-right font-medium text-muted-foreground">
                  {id.slice(0, 6)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.cov.map((row, i) => (
              <TableRow key={result.assetIds[i]} className="hover:bg-transparent">
                <TableHead className="h-auto p-1 pr-2 text-left font-medium text-muted-foreground">
                  {result.assetIds[i].slice(0, 6)}
                </TableHead>
                {row.map((value, j) => {
                  const intensity = maxAbs === 0 ? 0 : Math.abs(value) / maxAbs
                  const negative = value < 0
                  return (
                    <TableCell
                      key={`${i}-${j}`}
                      className={`p-1 text-right tabular-nums ${negative ? "text-muted-foreground" : "text-foreground"}`}
                      style={{
                        backgroundColor: `color-mix(in oklch, var(--foreground) ${Math.round(intensity * 22)}%, transparent)`,
                      }}
                    >
                      {value.toFixed(4)}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground">
          {n} × {n} sample covariance of monthly returns in the selected window.
        </p>
      </section>
    </div>
  )
}

export function WeightedPanel({ result }: { result: RunResult }) {
  if (result.path.length === 0) {
    return (
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        Rolling weights need {LOOKBACK_MONTHS} months of returns before the start
        date. Move the start later, or keep the default of Jan 2024.
      </p>
    )
  }

  const { optimized, equal, nifty } = result.metrics

  return (
    <div className="grid gap-8">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Each month the mix is re-solved on all history to date ({LOOKBACK_MONTHS}-month
        minimum lookback), then those weights earn the next month’s return. Risk-free
        rate {pct(RISK_FREE, 1)} p.a. First rebalance {result.firstRebalance ? monthLabel(result.firstRebalance) : "—"}.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="CAGR" value={pct(optimized.cagr)} />
        <MetricCard label="Ann. vol" value={pct(optimized.vol)} />
        <MetricCard label="Sharpe" value={number(optimized.sharpe, 2)} />
        <MetricCard label="Max drawdown" value={pct(optimized.maxDrawdown)} />
      </div>

      <WealthChart path={result.path} />

      <Table className="min-w-[40rem]">
        <TableHeader>
          <TableRow className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase hover:bg-transparent">
            <TableHead className="h-auto py-2 pr-4">Path</TableHead>
            <TableHead className="h-auto py-2 pr-4 text-right">End</TableHead>
            <TableHead className="h-auto py-2 pr-4 text-right">CAGR</TableHead>
            <TableHead className="h-auto py-2 pr-4 text-right">Vol</TableHead>
            <TableHead className="h-auto py-2 pr-4 text-right">Sharpe</TableHead>
            <TableHead className="h-auto py-2 text-right">Max DD</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <MetricRow name="Optimized GMV" m={optimized} />
          <MetricRow name="Equal weight" m={equal} />
          <MetricRow name="Nifty 50" m={nifty} />
        </TableBody>
      </Table>

      <section className="grid gap-3">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          Rebalancing weights
        </h2>
        <Table className="min-w-[52rem] text-[11px]">
          <TableHeader>
            <TableRow className="text-muted-foreground hover:bg-transparent">
              <TableHead className="h-auto py-2 pr-2">Month</TableHead>
              {result.assetIds.map((id) => (
                <TableHead key={id} className="h-auto py-2 pr-2 text-right">
                  {id.slice(0, 6)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.monthlyWeights.map((row) => (
              <TableRow key={row.date}>
                <TableCell className="py-1.5 pr-2 tabular-nums">{monthLabel(row.date)}</TableCell>
                {row.weights.map((weight, i) => (
                  <TableCell key={result.assetIds[i]} className="py-1.5 pr-2 text-right tabular-nums">
                    {weight < 0.005 ? "—" : pct(weight, 1)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader className="gap-1">
        <CardDescription className="text-[11px] tracking-[0.14em] uppercase">
          {label}
        </CardDescription>
        <CardTitle className="font-mono text-lg tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function MetricRow({
  name,
  m,
}: {
  name: string
  m: RunResult["metrics"]["optimized"]
}) {
  return (
    <TableRow>
      <TableCell className="py-2 pr-4">{name}</TableCell>
      <TableCell className="py-2 pr-4 text-right tabular-nums">{inr(m.end)}</TableCell>
      <TableCell className="py-2 pr-4 text-right tabular-nums">{pct(m.cagr)}</TableCell>
      <TableCell className="py-2 pr-4 text-right tabular-nums">{pct(m.vol)}</TableCell>
      <TableCell className="py-2 pr-4 text-right tabular-nums">{number(m.sharpe, 2)}</TableCell>
      <TableCell className="py-2 text-right tabular-nums">{pct(m.maxDrawdown)}</TableCell>
    </TableRow>
  )
}

function WealthChart({ path }: { path: RunResult["path"] }) {
  const width = 720
  const height = 240
  const pad = { l: 72, r: 16, t: 16, b: 32 }
  const innerW = width - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  let min = Infinity
  let max = -Infinity
  for (const point of path) {
    const values = [point.optimized, point.equal, point.nifty]
    for (const value of values) {
      if (value < min) min = value
      if (value > max) max = value
    }
  }
  const span = max - min || 1
  const x = (i: number) => pad.l + (i / Math.max(path.length - 1, 1)) * innerW
  const y = (value: number) => pad.t + ((max - value) / span) * innerH
  const line = (key: "optimized" | "equal" | "nifty") =>
    path.map((point, i) => `${x(i).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ")

  const ticks = 4
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => min + (span * i) / ticks)

  return (
    <figure className="grid gap-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full text-foreground"
        role="img"
        aria-label="Wealth of optimized, equal-weight, and Nifty 50 over the selected months"
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.l}
              x2={width - pad.r}
              y1={y(tick)}
              y2={y(tick)}
              stroke="currentColor"
              strokeOpacity="0.12"
            />
            <text
              x={pad.l - 8}
              y={y(tick) + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize="10"
            >
              {inr(tick)}
            </text>
          </g>
        ))}
        <polyline fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25" points={line("equal")} />
        <polyline fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.25" strokeDasharray="4 3" points={line("nifty")} />
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={line("optimized")} />
        <text x={pad.l} y={height - 8} className="fill-muted-foreground" fontSize="10">
          {monthLabel(path[0].date)}
        </text>
        <text x={width - pad.r} y={height - 8} textAnchor="end" className="fill-muted-foreground" fontSize="10">
          {monthLabel(path[path.length - 1].date)}
        </text>
      </svg>
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="text-foreground">Solid — optimized GMV</span>
        <span>Thin — equal weight</span>
        <span>Dashed — Nifty 50</span>
        <span>Month-end wealth in rupees</span>
      </figcaption>
    </figure>
  )
}
