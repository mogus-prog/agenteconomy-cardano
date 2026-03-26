"use client";

import { useState } from "react";
import { useWalletStore } from "@/lib/store";
import { useWalletBalance, useWalletTransactions, useWalletPolicy } from "@/lib/queries";
import { useSendFunds } from "@/lib/mutations";
import { formatAda, truncateAddress, cardanoscanUrl } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { AddressDisplay } from "@/components/address-display";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function WalletDashboardPage() {
  const { connected, address } = useWalletStore();

  if (!connected || !address) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass max-w-md rounded-xl p-10 text-center">
          <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Connect a Cardano wallet to view your balance and transactions.
          </p>
          <Button className="btn-primary px-6 py-2.5">Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return <WalletContent address={address} />;
}

function WalletContent({ address }: { address: string }) {
  const { data: balance, isLoading: loadingBalance } = useWalletBalance(address);
  const { data: txData, isLoading: loadingTxs } = useWalletTransactions(address);
  const { data: policy, isLoading: loadingPolicy } = useWalletPolicy(address);

  const transactions = txData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet" description="Balance, transactions, and spending policies" />

      {/* Balance Card */}
      {loadingBalance ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <div className="glass relative overflow-hidden rounded-xl border-indigo-500/20 p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/5 pointer-events-none" />
          <div className="relative">
            <p className="mb-1 text-sm text-muted-foreground">Available Balance</p>
            <p className="text-4xl font-mono font-black text-gradient-gold">
              {balance ? formatAda(balance.lovelace) : "0 ₳"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Cardano Mainnet</p>
            <div className="mt-6 flex gap-3">
              <SendDialog address={address} />
            </div>
          </div>
        </div>
      )}

      {/* Token Balances */}
      {balance && balance.tokens.length > 0 && (
        <div className="glass rounded-xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Tokens</h2>
          <div className="flex flex-wrap gap-2">
            {balance.tokens.map((token) => (
              <div
                key={token.unit}
                className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {truncateAddress(token.unit)}
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  {token.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="glass rounded-xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Recent Transactions
        </h2>
        {loadingTxs ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="w-12">Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Tx Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow
                  key={tx.txHash}
                  className="border-white/[0.06] hover:bg-white/[0.03]"
                >
                  <TableCell>
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                        tx.direction === "in"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {tx.direction === "in" ? "↓" : "↑"}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      tx.direction === "in" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {tx.direction === "in" ? "+" : "-"}
                    {formatAda(tx.amountLovelace)}
                  </TableCell>
                  <TableCell>
                    {tx.counterparty ? (
                      <AddressDisplay address={tx.counterparty} />
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(tx.blockTime).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <a
                      href={cardanoscanUrl(tx.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {truncateAddress(tx.txHash)}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        ) : (
          <EmptyState title="No transactions" description="Your transaction history will appear here." />
        )}
      </div>

      {/* Spending Policy */}
      <div className="glass rounded-xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Spending Policy
        </h2>
        {loadingPolicy ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : policy && (policy.dailyLimitLovelace || policy.perTxLimitLovelace || policy.whitelistedAddresses.length > 0) ? (
          <div className="space-y-3">
            {policy.dailyLimitLovelace && (
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3">
                <span className="text-sm text-muted-foreground">Daily Limit</span>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {formatAda(policy.dailyLimitLovelace)}
                </span>
              </div>
            )}
            {policy.perTxLimitLovelace && (
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3">
                <span className="text-sm text-muted-foreground">Per-Transaction Limit</span>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {formatAda(policy.perTxLimitLovelace)}
                </span>
              </div>
            )}
            {policy.whitelistedAddresses.length > 0 && (
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3">
                <p className="mb-2 text-sm text-muted-foreground">
                  Whitelisted Addresses
                </p>
                <div className="space-y-1">
                  {policy.whitelistedAddresses.map((addr) => (
                    <AddressDisplay key={addr} address={addr} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No spending policy configured</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Set up spending limits through the AgentWallet SDK.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SendDialog({ address }: { address: string }) {
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const sendFunds = useSendFunds();

  const handleSend = () => {
    if (!toAddress || !amount) return;
    const lovelace = String(Math.floor(parseFloat(amount) * 1_000_000));
    sendFunds.mutate(
      { address, toAddress, amountLovelace: lovelace },
      {
        onSuccess: () => {
          setOpen(false);
          setToAddress("");
          setAmount("");
        },
      }
    );
  };

  const feeEstimate = amount ? "~0.17 ₳" : "—";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-primary px-5 py-2.5">Send</Button>
      </DialogTrigger>
      <DialogContent className="glass border-white/[0.08] bg-navy-950 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Send ADA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Recipient Address
            </label>
            <Input
              placeholder="addr1..."
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="border-white/[0.08] bg-white/[0.03] font-mono text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Amount (ADA)
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-white/[0.08] bg-white/[0.03] font-mono"
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Estimated Fee</span>
            <span className="font-mono">{feeEstimate}</span>
          </div>
          <Button
            onClick={handleSend}
            disabled={!toAddress || !amount || sendFunds.isPending}
            className="btn-primary w-full py-2.5"
          >
            {sendFunds.isPending ? "Building Tx..." : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
