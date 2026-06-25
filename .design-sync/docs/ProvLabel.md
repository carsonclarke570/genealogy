---
category: Forms
---

## Props

```ts
interface ProvLabelProps {
  /** The visible field label. */
  label: React.ReactNode;
  /** Current confidence for the fact this field records. */
  status: "verified" | "unverified" | "estimated" | "disputed";
  /** Documents the mark can cite as the fact's source. */
  sources: SourceOption[];
  /** Fired when the confidence or cited source changes. */
  onChange: (status: ProvenanceStatus, sourceLabel?: string, sourceId?: string) => void;
}
```
