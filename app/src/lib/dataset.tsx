"use client";

/**
 * Client-side access to the family dataset.
 *
 * The server loads the dataset once (lib/queries.getDataset) in the root page
 * and hands it to <DatasetProvider>; client components read it through
 * useDataset() instead of importing static data. This is the seam between the
 * SQLite read model and the interactive UI.
 */
import { createContext, useContext } from "react";
import type { Dataset } from "./family-data";

const DatasetContext = createContext<Dataset | null>(null);

export function DatasetProvider({
  value,
  children,
}: {
  value: Dataset;
  children: React.ReactNode;
}) {
  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset(): Dataset {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error("useDataset must be used within a <DatasetProvider>");
  return ctx;
}
