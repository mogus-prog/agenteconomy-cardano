import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ── Wallet Store ── */

interface WalletState {
  connected: boolean;
  address: string | null;
  walletName: string | null;
  setWallet: (address: string, walletName: string) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      connected: false,
      address: null,
      walletName: null,
      setWallet: (address: string, walletName: string) =>
        set({ connected: true, address, walletName }),
      disconnect: () =>
        set({ connected: false, address: null, walletName: null }),
    }),
    {
      name: "agent-economy-wallet",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : ({
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        } as unknown as Storage)
      ),
    }
  )
);

/* ── App Store ── */

interface AppState {
  isRegisteredAgent: boolean;
  network: "preprod" | "mainnet";
  setIsRegisteredAgent: (val: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  isRegisteredAgent: false,
  network: (process.env.NEXT_PUBLIC_NETWORK as "preprod" | "mainnet") ?? "mainnet",
  setIsRegisteredAgent: (val: boolean) => set({ isRegisteredAgent: val }),
}));
