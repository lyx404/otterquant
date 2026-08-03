import { useEffect, useMemo } from "react";
import { useParams } from "wouter";
import {
  marketplaceStrategies,
  marketplaceTradeSource,
} from "@/lib/marketplaceData";
import { tradeBots, type TradeBot } from "@/lib/tradeData";
import TradeDetail from "./TradeDetail";

export default function MarketplaceDetail() {
  const params = useParams<{ id: string }>();
  const strategyId = params?.id ?? "";
  const trade = useMemo<TradeBot | null>(() => {
    const strategy = marketplaceStrategies.find((item) => item.id === strategyId);
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
