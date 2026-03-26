"use client";

import { Copy, ExternalLink } from "lucide-react";
import { truncateAddress, cardanoscanUrl } from "@/lib/utils";
import { toast } from "sonner";

interface AddressDisplayProps {
  address: string;
  label?: string;
  type?: "address" | "transaction";
}

export function AddressDisplay({
  address,
  label,
  type = "address",
}: AddressDisplayProps) {
  function handleCopy() {
    navigator.clipboard.writeText(address);
    toast.success("Copied to clipboard");
  }

  return (
    <div>
      {label && (
        <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      )}
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-indigo-400">
          {truncateAddress(address)}
        </span>
        <button
          onClick={handleCopy}
          className="text-muted-foreground transition-colors hover:text-foreground"
          title="Copy full address"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <a
          href={cardanoscanUrl(
            address,
            type === "transaction" ? "transaction" : "address"
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground transition-colors hover:text-foreground"
          title="View on CardanoScan"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
