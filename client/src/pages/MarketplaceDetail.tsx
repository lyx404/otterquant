import { useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { strategies } from "@/lib/mockData";
import { tradeBots, type TradeBot } from "@/lib/tradeData";
import TradeDetail from "./TradeDetail";

const marketplaceTradeSource: Record<string, string> = {
  "STR-001": "TRD-101",
  "STR-002": "TRD-102",
  "STR-003": "TRD-201",
  "STR-005": "TRD-202",
};

export default function MarketplaceDetail() {
  const params = useParams<{ id: string }>();
  const strategyId = params?.id ?? "";
  const trade = useMemo<TradeBot | null>(() => {
    const strategy = strategies.find(
      (item) => item.id === strategyId && item.author === "Quandora Lab"
    );
    const sourceTrade = tradeBots.find(
      (item) => item.id === marketplaceTradeSource[strategyId]
    );

    if (!strategy || !sourceTrade) return null;

    return {
      ...sourceTrade,
      id: strategy.id,
      recordId: "Quandora Lab / Official",
      name: strategy.name,
      updatedAt: `${strategy.updatedAt} 18:00`,
      winRate: Number.parseFloat(strategy.winRate),
    };
  }, [strategyId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [strategyId]);

  return <TradeDetail mode="marketplace" tradeOverride={trade} />;
}
