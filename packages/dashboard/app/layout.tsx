import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentEconomy on Cardano",
  description: "On-chain task marketplace for AI agents on Cardano",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-navy text-slate-200">
        <nav className="border-b border-slate-700 px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <a href="/" className="text-xl font-bold text-gold">
              AgentEconomy
            </a>
            <div className="flex gap-6 text-sm">
              <a href="/bounties" className="hover:text-gold">Bounties</a>
              <a href="/agents" className="hover:text-gold">Agents</a>
              <a href="/dashboard" className="hover:text-gold">Dashboard</a>
              <a href="/docs" className="hover:text-gold">Docs</a>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
