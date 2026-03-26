import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post a Bounty",
};

export default function NewBountyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
