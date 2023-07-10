import { Swap } from "@/components/Swap";
import { ArbitrarySign } from "@/components/ArbitrarySign";

export const metadata = {
  title: "Shuttle Port (Next.js)",
  description: "Shuttle Port example app built with Next.js",
};

export default async function Home() {
  return (
    <main>
      <Swap />
      <ArbitrarySign />
    </main>
  );
}
