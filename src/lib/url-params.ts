const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export type AppTab = "raw" | "opt" | "weighted"

export type AppUrlState = {
  from: string | null
  to: string | null
  amount: string | null
  tab: AppTab | null
}

export function readAppUrlState(search = window.location.search): AppUrlState {
  const params = new URLSearchParams(search)
  const from = params.get("from")
  const to = params.get("to")
  const amount = params.get("amount")
  const tab = params.get("tab")

  return {
    from: from && ISO_DATE.test(from) ? from : null,
    to: to && ISO_DATE.test(to) ? to : null,
    amount: amount && /^\d+$/.test(amount) ? amount : null,
    tab: tab === "raw" || tab === "opt" || tab === "weighted" ? tab : null,
  }
}

export function writeAppUrlState(state: {
  from: string
  to: string
  amount: string
  tab: AppTab
}) {
  const params = new URLSearchParams()
  params.set("from", state.from)
  params.set("to", state.to)
  params.set("amount", state.amount)
  params.set("tab", state.tab)
  const next = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState(null, "", next)
}
