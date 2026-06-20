import { AppShell } from "@/components/AppShell";
import { getDataset } from "@/lib/queries";

// Read the latest family data from SQLite on each request.
export const dynamic = "force-dynamic";

export default function Page() {
  const data = getDataset();
  return <AppShell data={data} />;
}
