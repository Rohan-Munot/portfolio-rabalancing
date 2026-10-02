import { useEffect, useState } from "react"

import {
  fetchMarketPrices,
  type MarketPricesResult,
} from "@/lib/yahoo-finance"

type State = {
  data: MarketPricesResult | null
  loading: boolean
  error: string | null
}

export function useYahooPrices(from: string, to: string) {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    setState((current) => ({ ...current, loading: true, error: null }))

    fetchMarketPrices(from, to)
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : "Failed to fetch prices",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [from, to])

  return state
}
