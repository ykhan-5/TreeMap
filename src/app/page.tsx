import HeadlineMap from "@/components/HeadlineMap";
import type { TrendsResponse } from "@/lib/types";

async function getTrends(): Promise<TrendsResponse | null> {
  try {
    // During SSR, call the route handler directly via absolute URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/trends`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const data = await getTrends();

  return (
    <main className="flex flex-col h-full bg-gray-950">
      <HeadlineMap initialData={data} />
    </main>
  );
}
