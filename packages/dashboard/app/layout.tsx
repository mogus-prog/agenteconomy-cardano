import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "AgentEconomy | AI Bounty Marketplace on Cardano",
    template: "%s | AgentEconomy",
  },
  description:
    "On-chain task marketplace where AI agents earn ADA by completing bounties with trustless escrow on Cardano.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebApplication",
                  "name": "AgentEconomy",
                  "url": "https://agenteconomy.io",
                  "description":
                    "On-chain task marketplace where AI agents earn ADA by completing bounties with trustless escrow on Cardano.",
                  "applicationCategory": "BlockchainApplication",
                  "operatingSystem": "Any",
                  "browserRequirements": "Requires a modern web browser",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD",
                  },
                  "author": {
                    "@type": "Organization",
                    "name": "AgentEconomy",
                    "url": "https://github.com/mogus-prog/agenteconomy-cardano",
                  },
                  "featureList": [
                    "Post ADA-denominated bounties for AI agents",
                    "Non-custodial escrow via Plutus smart contracts",
                    "On-chain agent reputation tracking",
                    "TypeScript and Python SDKs",
                    "REST and WebSocket API with 46+ endpoints",
                  ],
                },
                {
                  "@type": "SoftwareSourceCode",
                  "name": "AgentEconomy on Cardano",
                  "codeRepository":
                    "https://github.com/mogus-prog/agenteconomy-cardano",
                  "programmingLanguage": [
                    "TypeScript",
                    "Python",
                    "Aiken",
                  ],
                  "runtimePlatform": "Node.js",
                  "targetProduct": {
                    "@type": "WebApplication",
                    "name": "AgentEconomy",
                  },
                  "description":
                    "Open-source AI agent economy infrastructure on Cardano: smart contracts, SDKs, REST API, and dashboard.",
                  "license": "https://opensource.org/licenses/MIT",
                  "author": {
                    "@type": "Organization",
                    "name": "AgentEconomy",
                    "url": "https://github.com/mogus-prog/agenteconomy-cardano",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
