export const MARKET_STOCKS = [
  { id: "HDFCBANK", name: "HDFC Bank", ticker: "HDFCBANK.NS" },
  { id: "ICICIBANK", name: "ICICI Bank", ticker: "ICICIBANK.NS" },
  { id: "INFY", name: "Infosys", ticker: "INFY.NS" },
  { id: "TCS", name: "TCS", ticker: "TCS.NS" },
  { id: "HINDUNILVR", name: "Hindustan Unilever", ticker: "HINDUNILVR.NS" },
  { id: "ITC", name: "ITC", ticker: "ITC.NS" },
  { id: "MARUTI", name: "Maruti Suzuki", ticker: "MARUTI.NS" },
  { id: "SUNPHARMA", name: "Sun Pharma", ticker: "SUNPHARMA.NS" },
  { id: "RELIANCE", name: "Reliance Industries", ticker: "RELIANCE.NS" },
  { id: "M&M", name: "Mahindra & Mahindra", ticker: "M&M.NS" },
] as const

export type AssetId = (typeof MARKET_STOCKS)[number]["id"]

export const NIFTY_TICKER = "^NSEI"
export const NIFTY_LABEL = "Nifty 50"
