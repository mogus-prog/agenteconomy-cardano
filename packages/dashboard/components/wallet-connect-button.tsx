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
  { name: "eternl", label: "Eternl" },
  { name: "lace", label: "Lace" },
  { name: "nami", label: "Nami" },
  { name: "vespr", label: "Vespr" },
] as const;

export function WalletConnectButton() {
  const { connected, address, walletName, setWallet, disconnect } =
    useWalletStore();
  const [open, setOpen] = useState(false);

  async function handleConnect(name: string) {
    // Simulate wallet connection for now
    // Real MeshJS integration will be added when testing with browser wallets
    const stubAddress =
      "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjc7";
    setWallet(stubAddress, name);
    setOpen(false);
    toast.success(`Connected with ${name}`);
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
            <span className="font-mono text-sm">
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
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Select a Cardano wallet to connect to AgentEconomy.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {WALLETS.map((w) => (
            <Button
              key={w.name}
              variant="outline"
              className="justify-start gap-3 border-white/[0.08] bg-white/[0.02] py-6 text-left hover:bg-white/[0.06] hover:border-white/[0.15]"
              onClick={() => handleConnect(w.name)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                <Wallet className="h-4 w-4 text-indigo-400" />
              </div>
              <span className="text-sm font-medium">{w.label}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
