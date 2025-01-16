import { Swap } from "@/components/Swap";
import { ArbitrarySign } from "@/components/ArbitrarySign";
import { EthereumSign } from "@/components/EthereumSign";

export const metadata = {
  title: "Shuttle Port (Next.js)",
  description: "Shuttle Port example app built with Next.js",
};

export default async function Home() {
  return (
    <main>
      <Swap />
      <ArbitrarySign />
      <EthereumSign />
    </main>
  );
}
