import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bounty Board",
};

export default function BountiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
