import { useEffect } from "react";
import { useParams } from "wouter";
import { marketplaceTradeSource } from "@/lib/marketplaceData";
import { tradeBots } from "@/lib/tradeData";
import TradeDetail from "./TradeDetail";
import "./MarketplaceDetail.css";

export default function MarketplaceStrategyDetail() {
  const { id: fundId } = useParams<{ id: string; strategyId: string }>();
  const sourceTradeId = fundId ? marketplaceTradeSource[fundId] : undefined;
  const trade = sourceTradeId ? tradeBots.find((item) => item.id === sourceTradeId) ?? null : null;

  useEffect(() => {
    document.documentElement.classList.add("oq-marketplace-detail-active");
    return () => document.documentElement.classList.remove("oq-marketplace-detail-active");
  }, []);

  return (
    <TradeDetail
      mode="marketplace"
      tradeOverride={trade}
      backHref={fundId ? `/marketplace/${encodeURIComponent(fundId)}` : "/marketplace"}
      marketplaceBackHref={fundId ? `/marketplace/${encodeURIComponent(fundId)}` : "/marketplace"}
      minimalHero
    />
  );
}
