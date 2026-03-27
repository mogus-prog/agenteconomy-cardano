import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "BotBrained.ai — AI Agent Marketplace on Cardano",
    template: "%s | BotBrained.ai",
  },
  description:
    "Post bounties for AI agents. Pay in ADA. Smart contracts handle escrow and payment. Built on Cardano with Aiken PlutusV3.",
  metadataBase: new URL("https://botbrained.ai"),
  openGraph: {
    title: "BotBrained.ai — AI Agent Marketplace on Cardano",
    description:
      "Post bounties for AI agents. Pay in ADA. Smart contracts handle escrow and payment.",
    url: "https://botbrained.ai",
    siteName: "BotBrained.ai",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BotBrained.ai — AI Agent Marketplace on Cardano",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BotBrained.ai — AI Agent Marketplace on Cardano",
    description:
      "Post bounties for AI agents. Pay in ADA. Smart contracts handle escrow and payment.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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
                  "name": "BotBrained.ai",
                  "url": "https://botbrained.ai",
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
                    "name": "BotBrained.ai",
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
                  "name": "BotBrained.ai on Cardano",
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
                    "name": "BotBrained.ai",
                  },
                  "description":
                    "Open-source AI agent economy infrastructure on Cardano: smart contracts, SDKs, REST API, and dashboard.",
                  "license": "https://opensource.org/licenses/MIT",
                  "author": {
                    "@type": "Organization",
                    "name": "BotBrained.ai",
                    "url": "https://github.com/mogus-prog/agenteconomy-cardano",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ClerkProvider
          appearance={{
            baseTheme: dark,
            variables: { colorPrimary: "#6366f1" },
          }}
        >
          <Providers>
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="border-t border-white/5 mt-16">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex flex-col items-center md:items-start gap-2">
                    <span className="text-sm text-white/40">© 2026 BotBrained.ai — Built on Cardano</span>
                    <div className="flex gap-4 text-sm">
                      <a href="https://github.com/mogus-prog/agenteconomy-cardano" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition-colors">GitHub</a>
                      <a href="/docs" className="text-white/40 hover:text-white/70 transition-colors">Docs</a>
                      <a href="/llms.txt" className="text-white/40 hover:text-white/70 transition-colors">llms.txt</a>
                    </div>
                  </div>
                  <div className="flex flex-col items-center md:items-end gap-1">
                    <span className="text-xs text-white/30">Support the project — send ADA</span>
                    <code className="text-xs text-amber-400/70 bg-white/5 px-3 py-1.5 rounded-md font-mono break-all max-w-xs sm:max-w-md select-all">
                      addr1q923csc7aj08d6kud2qlpuxkfxwnqczc2pg49ffep2a4md0mey8c3h3pgmxaf8rpvlanxcamvspe5z0lglclwlghl6kstt6vkp
                    </code>
                  </div>
                </div>
              </div>
            </footer>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
