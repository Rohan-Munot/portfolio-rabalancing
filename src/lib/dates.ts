export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function subtractMonths(isoDate: string, months: number): string {
  const date = parseISODate(isoDate)
  date.setMonth(date.getMonth() - months)
  return toISODate(date)
}

export function monthEndsInRange(from: string, to: string): string[] {
  if (from > to) return []

  const dates = new Set<string>([from, to])
  const start = parseISODate(from)
  const end = parseISODate(to)
  let year = start.getFullYear()
  let month = start.getMonth()

  while (true) {
    const monthEnd = new Date(year, month + 1, 0)
    const iso = toISODate(monthEnd)
    if (monthEnd >= start && monthEnd <= end) dates.add(iso)
    if (monthEnd >= end) break
    month++
    if (month > 11) {
      month = 0
      year++
    }
  }

  return [...dates].sort()
}
