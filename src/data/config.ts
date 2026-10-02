import { subtractMonths, toISODate } from "@/lib/dates"

export const DEFAULT_RANGE_MONTHS = 5
export const DEFAULT_AMOUNT = 100_000
export const LOOKBACK_MONTHS = 6
export const RISK_FREE = 0.065

export function getDefaultTo(): string {
  return toISODate(new Date())
}

export function getDefaultFrom(): string {
  return subtractMonths(getDefaultTo(), DEFAULT_RANGE_MONTHS)
}
