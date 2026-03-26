"use client";

import { useState } from "react";
import { Wallet, Copy, ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWalletStore } from "@/lib/store";
import { truncateAddress, cardanoscanUrl } from "@/lib/utils";
import { toast } from "sonner";

const WALLETS = [
  { name: "lace", label: "Lace" },
  { name: "eternl", label: "Eternl" },
  { name: "nami", label: "Nami" },
  { name: "vespr", label: "Vespr" },
] as const;

export function WalletConnectButton() {
  const { connected, address, walletName, setWallet, disconnect } =
    useWalletStore();
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  async function handleConnect(name: string) {
    setConnecting(name);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cardano = (window as any).cardano;
      if (!cardano?.[name]) {
        toast.error(`${name} wallet not found`, {
          description: "Please install the browser extension and reload.",
        });
        return;
      }

      // Enable the wallet via CIP-30
      const api = await cardano[name].enable();

      // Get the wallet's used addresses (hex-encoded)
      const hexAddresses: string[] = await api.getUsedAddresses();
      if (!hexAddresses || hexAddresses.length === 0) {
        // Try change address as fallback
        const changeAddr: string = await api.getChangeAddress();
        if (!changeAddr) {
          toast.error("No addresses found in wallet");
          return;
        }
        // Convert hex to bech32 using the CSL if available, or use a helper
        const bech32Addr = await hexToBech32(changeAddr);
        setWallet(bech32Addr, name);
      } else {
        const bech32Addr = await hexToBech32(hexAddresses[0]);
        setWallet(bech32Addr, name);
      }

      setOpen(false);
      toast.success(`Connected with ${name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("refused") || msg.includes("cancelled") || msg.includes("User declined")) {
        toast.error("Connection cancelled");
      } else {
        toast.error("Failed to connect wallet", { description: msg });
      }
    } finally {
      setConnecting(null);
    }
  }

  function handleCopy() {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  }

  if (connected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.06]"
          >
            <Wallet className="h-4 w-4 text-teal" />
            <span className="hidden font-mono text-sm sm:inline">
              {truncateAddress(address)}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground">
              Connected via {walletName}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={cardanoscanUrl(address, "address")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on CardanoScan
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={disconnect}
            className="text-red-400 focus:text-red-400"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Wallet</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Select a Cardano wallet to connect to BotBrained.ai.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {WALLETS.map((w) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const available = typeof window !== "undefined" && !!(window as any).cardano?.[w.name];
            return (
              <Button
                key={w.name}
                variant="outline"
                className="justify-start gap-3 border-white/[0.08] bg-white/[0.02] py-6 text-left hover:bg-white/[0.06] hover:border-white/[0.15] disabled:opacity-40"
                onClick={() => handleConnect(w.name)}
                disabled={!available || connecting !== null}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                  <Wallet className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{w.label}</span>
                  {!available && (
                    <span className="text-xs text-muted-foreground">Not installed</span>
                  )}
                </div>
                {connecting === w.name && (
                  <span className="ml-auto text-xs text-muted-foreground animate-pulse">
                    Connecting...
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Convert a hex-encoded Cardano address to bech32 (addr_test1... or addr1...).
 * Uses a lightweight approach without requiring full CSL.
 */
async function hexToBech32(hex: string): Promise<string> {
  // Try using the CardanoWasm if available via MeshJS
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CSL = (window as any).CardanoSerializationLib;
    if (CSL) {
      const addr = CSL.Address.from_bytes(Buffer.from(hex, "hex"));
      return addr.to_bech32();
    }
  } catch {
    // fallback below
  }

  // Use the bech32 encoding directly
  // Cardano addresses: network byte 0x00 = testnet, 0x01 = mainnet
  // The CIP-30 getUsedAddresses returns hex CBOR, we need to convert
  try {
    const { bech32 } = await import("bech32");
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
    const networkByte = bytes[0] & 0x0f;
    const prefix = networkByte === 0 ? "addr_test" : "addr";
    const words = bech32.toWords(bytes);
    return bech32.encode(prefix, words, 200);
  } catch {
    // Last resort: return the hex prefixed so we know it's not bech32
    // The API should still work with hex addresses
    return hex;
  }
}
