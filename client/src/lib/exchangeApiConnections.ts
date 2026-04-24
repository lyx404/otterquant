export type ExchangeVenue = "binance" | "okx";

export interface ExchangeApiConnection {
  id: string;
  venue: ExchangeVenue;
  accountName: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "otter_exchange_api_connections_v1";

export const DEFAULT_EXCHANGE_API_CONNECTIONS: ExchangeApiConnection[] = [
  {
    id: "ex-1",
    venue: "binance",
    accountName: "Primary Futures Account",
    apiKey: "bn_api_x9f4k2p7q1m5",
    createdAt: "2026-04-18",
    updatedAt: "2026-04-20",
  },
];

const venueMeta: Record<
  ExchangeVenue,
  {
    label: string;
    badge: string;
    iconText: string;
    iconClassName: string;
  }
> = {
  binance: {
    label: "Binance",
    badge: "BINANCE",
    iconText: "BN",
    iconClassName: "bg-amber-400/20 text-amber-300 border-amber-400/30",
  },
  okx: {
    label: "OKX",
    badge: "OKX",
    iconText: "OK",
    iconClassName: "bg-slate-200/20 text-slate-200 border-slate-200/30",
  },
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isExchangeApiConnection(item: unknown): item is ExchangeApiConnection {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<ExchangeApiConnection>;
  return (
    typeof candidate.id === "string" &&
    (candidate.venue === "binance" || candidate.venue === "okx") &&
    typeof candidate.accountName === "string" &&
    typeof candidate.apiKey === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

export function getExchangeVenueMeta(venue: ExchangeVenue) {
  return venueMeta[venue];
}

export function readExchangeApiConnections(): ExchangeApiConnection[] {
  if (!canUseStorage()) return DEFAULT_EXCHANGE_API_CONNECTIONS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_EXCHANGE_API_CONNECTIONS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_EXCHANGE_API_CONNECTIONS;
    return parsed.filter(isExchangeApiConnection);
  } catch {
    return DEFAULT_EXCHANGE_API_CONNECTIONS;
  }
}

export function writeExchangeApiConnections(items: ExchangeApiConnection[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
