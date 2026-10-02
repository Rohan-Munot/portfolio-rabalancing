import { useEffect, useMemo, useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { MarketPrices } from "@/components/market-prices"
import { OptimizationsPanel, RawPanel, WeightedPanel, Field } from "@/components/panels"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DEFAULT_AMOUNT, getDefaultFrom, getDefaultTo } from "@/data/config"
import { useYahooPrices } from "@/hooks/use-yahoo-prices"
import { parseISODate, toISODate } from "@/lib/dates"
import { dateLabel, inr } from "@/lib/format"
import { runPortfolio } from "@/lib/portfolio"
import { readAppUrlState, writeAppUrlState, type AppTab } from "@/lib/url-params"

const TABS = [
  { id: "raw", label: "Raw" },
  { id: "opt", label: "Optimizations" },
  { id: "weighted", label: "Weighted" },
] as const

type TabId = (typeof TABS)[number]["id"]

function initialFromDate() {
  const url = readAppUrlState()
  return parseISODate(url.from ?? getDefaultFrom())
}

function initialToDate() {
  const url = readAppUrlState()
  return parseISODate(url.to ?? getDefaultTo())
}

function initialAmount() {
  const url = readAppUrlState()
  return url.amount ?? String(DEFAULT_AMOUNT)
}

function initialTab(): TabId {
  const url = readAppUrlState()
  return url.tab ?? "raw"
}

export function App() {
  const [amountText, setAmountText] = useState(initialAmount)
  const [fromDate, setFromDate] = useState(initialFromDate)
  const [toDate, setToDate] = useState(initialToDate)
  const [tab, setTab] = useState<TabId>(initialTab)

  const from = toISODate(fromDate)
  const to = toISODate(toDate)

  useEffect(() => {
    writeAppUrlState({
      from,
      to,
      amount: amountText.replace(/,/g, "") || "0",
      tab: tab as AppTab,
    })
  }, [from, to, amountText, tab])

  const amount = Number(amountText.replace(/,/g, ""))
  const market = useYahooPrices(from, to)
  const result = useMemo(
    () => (market.data ? runPortfolio({ amount, from, to, market: market.data }) : null),
    [amount, from, to, market.data],
  )

  const headline =
    tab === "weighted" && result ? result.metrics.optimized.end : result?.amount ?? amount
  const headlineLabel = tab === "weighted" ? "Ending value" : "Invested"

  return (
    <div className="mx-auto min-h-svh px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-8 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3">
          <h1 className="max-w-xl text-3xl leading-none tracking-tight sm:text-4xl">
            Portfolio Rebalancing Optimization
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Ten Nifty names, long-only GMV, recut every month. Enter an amount
            and a window — the three tabs use live Yahoo Finance data.
          </p>
          <p className="font-mono text-3xl tabular-nums tracking-tight sm:text-4xl">
            {inr(Number.isFinite(headline) ? headline : 0)}
          </p>
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {headlineLabel}
            {" · "}
            {dateLabel(from)}
            {" – "}
            {dateLabel(to)}
          </p>
        </div>

        <form
          className="grid w-full max-w-md grid-cols-2 gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="col-span-2">
            <Field label="Amount (₹)">
              <Input
                className="tabular-nums"
                inputMode="numeric"
                value={amountText}
                onChange={(event) => setAmountText(event.target.value)}
                aria-label="Investment amount in rupees"
              />
            </Field>
          </div>
          <Field label="From">
            <DatePicker
              value={fromDate}
              onChange={(date) => date && setFromDate(date)}
              disabled={(date) => date > toDate}
              aria-label="Start date"
            />
          </Field>
          <Field label="To">
            <DatePicker
              value={toDate}
              onChange={(date) => date && setToDate(date)}
              disabled={(date) => date < fromDate}
              aria-label="End date"
            />
          </Field>
        </form>
      </header>

      <MarketPrices
        from={from}
        to={to}
        data={market.data}
        loading={market.loading}
        error={market.error}
      />

      {market.loading ? (
        <p className="py-8 text-sm text-muted-foreground">Loading portfolio calculations…</p>
      ) : market.error ? (
        <p className="py-8 text-sm text-destructive">{market.error}</p>
      ) : result ? (
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as TabId)}
          className="pt-0"
        >
          <TabsList variant="line" className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
            {TABS.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="rounded-none px-0 py-3 after:bottom-0 data-active:bg-transparent dark:data-active:bg-transparent"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="raw" className="pt-8">
            <RawPanel result={result} market={market} />
          </TabsContent>
          <TabsContent value="opt" className="pt-8">
            <OptimizationsPanel result={result} />
          </TabsContent>
          <TabsContent value="weighted" className="pt-8">
            <WeightedPanel result={result} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  )
}

export default App
