import { NIFTY_LABEL } from "@/data/stocks"
import { dateLabel, number } from "@/lib/format"
import { sliceMarketWindow, type MarketPricesResult } from "@/lib/yahoo-finance"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type MarketPricesProps = {
  from: string
  to: string
  data: MarketPricesResult | null
  loading: boolean
  error: string | null
}

export function MarketPrices({ from, to, data, loading, error }: MarketPricesProps) {
  const window = data ? sliceMarketWindow(data, from, to) : null

  return (
    <section className="grid gap-3 pb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          Yahoo Finance — closing prices
        </h2>
        <p className="text-xs text-muted-foreground">
          {dateLabel(from)} – {dateLabel(to)} · Adjusted close (INR)
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading prices from Yahoo Finance…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : window && window.dates.length > 0 ? (
        <Table className="min-w-[72rem] text-xs">
          <TableHeader>
            <TableRow className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 h-auto bg-background py-2 pr-3">
                Date
              </TableHead>
              {window.stocks.map((stock) => (
                <TableHead key={stock.id} className="h-auto py-2 pr-3 text-right">
                  {stock.ticker}
                </TableHead>
              ))}
              <TableHead className="h-auto py-2 text-right">{NIFTY_LABEL}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {window.dates.map((date, rowIndex) => (
              <TableRow key={date}>
                <TableCell className="sticky left-0 z-10 bg-background py-1.5 pr-3 tabular-nums">
                  {dateLabel(date)}
                </TableCell>
                {window.stocks.map((stock) => (
                  <TableCell
                    key={stock.id}
                    className="py-1.5 pr-3 text-right tabular-nums"
                  >
                    {formatClose(stock.closes[rowIndex])}
                  </TableCell>
                ))}
                <TableCell className="py-1.5 text-right tabular-nums">
                  {formatClose(window.nifty[rowIndex])}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">No dates in the selected range.</p>
      )}
    </section>
  )
}

function formatClose(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return number(value, 2)
}
