"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Threshold } from "./types";

interface SetupState {
  coinSymbol: string | null;
  thresholdId: Threshold["id"] | null;
  phone: string;
  verified: boolean;
  setCoin: (symbol: string) => void;
  setThreshold: (id: Threshold["id"]) => void;
  setPhone: (phone: string) => void;
  setVerified: (v: boolean) => void;
  reset: () => void;
}

export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      coinSymbol: null,
      thresholdId: null,
      phone: "",
      verified: false,
      setCoin: (symbol) => set({ coinSymbol: symbol }),
      setThreshold: (id) => set({ thresholdId: id }),
      setPhone: (phone) => set({ phone }),
      setVerified: (verified) => set({ verified }),
      reset: () =>
        set({
          coinSymbol: null,
          thresholdId: null,
          phone: "",
          verified: false,
        }),
    }),
    { name: "whalebell-setup" },
  ),
);
