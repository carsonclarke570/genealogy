---
category: Forms
---

## Props

```ts
interface ProvLocationFieldProps {
  label: React.ReactNode;
  /** Shown as the picker's hint line. */
  placeholder?: string;
  /** The form field `name` the place label submits under, and the provenance key. */
  fieldKey: string;
  value: LocationValue;
  onChange: (value: LocationValue | null) => void;
  status: "verified" | "unverified" | "estimated" | "disputed";
  sources: SourceOption[];
  onProvChange: (fieldKey: string, status: ProvenanceStatus, sourceLabel?: string, sourceId?: string) => void;
  onSearch: (query: string) => Promise<LocationSuggestion[]>;
}
```
