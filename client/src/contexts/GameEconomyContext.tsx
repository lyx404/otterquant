import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FISH_BALANCE_AMOUNT,
  HUD_CASH_CENTS,
  SYSTEM_BALANCE_AMOUNT,
} from "@/lib/gameWallet";

type GameEconomyContextValue = {
  coinBalance: number;
  cashCents: number;
  fishBalance: number;
  spendCoins: (amount: number) => void;
  addCashCents: (amount: number) => void;
  spendCashCents: (amount: number) => void;
};

const GameEconomyContext = createContext<GameEconomyContextValue | undefined>(undefined);

export function GameEconomyProvider({ children }: { children: ReactNode }) {
  const [coinBalance, setCoinBalance] = useState(SYSTEM_BALANCE_AMOUNT);
  const [cashCents, setCashCents] = useState(HUD_CASH_CENTS);

  const spendCoins = useCallback((amount: number) => {
    setCoinBalance((current) => Math.max(0, current - Math.max(0, Math.round(amount || 0))));
  }, []);

  const addCashCents = useCallback((amount: number) => {
    setCashCents((current) => current + Math.max(0, Math.round(amount || 0)));
  }, []);

  const spendCashCents = useCallback((amount: number) => {
    setCashCents((current) => Math.max(0, current - Math.max(0, Math.round(amount || 0))));
  }, []);

  const value = useMemo<GameEconomyContextValue>(() => ({
    coinBalance,
    cashCents,
    fishBalance: FISH_BALANCE_AMOUNT,
    spendCoins,
    addCashCents,
    spendCashCents,
  }), [addCashCents, cashCents, coinBalance, spendCashCents, spendCoins]);

  return (
    <GameEconomyContext.Provider value={value}>
      {children}
    </GameEconomyContext.Provider>
  );
}

export function useGameEconomy() {
  const context = useContext(GameEconomyContext);

  if (!context) {
    throw new Error("useGameEconomy must be used within GameEconomyProvider");
  }

  return context;
}
