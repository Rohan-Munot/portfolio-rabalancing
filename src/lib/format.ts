export function inr(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function pct(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—"
  return `${(value * 100).toFixed(digits)}%`
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

export function monthLabel(date: string): string {
  const [year, month] = date.split("-")
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`
}

export function dateLabel(date: string): string {
  const [year, month, day] = date.split("-")
  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1]} ${year}`
}

export function number(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—"
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}
