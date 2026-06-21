import { AppShell } from "@/components/AppShell";
import { getDataset } from "@/lib/queries";

// Read the latest family data from Postgres on each request.
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getDataset();
  return <AppShell data={data} />;
}
