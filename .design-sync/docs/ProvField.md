---
category: Forms
---

ProvField — a text {@link Input} carrying its provenance mark in the label.

The everyday pairing for a recorded fact: the value on the left, a confidence
mark on the label that opens to set status and cite a source. Uncontrolled
(it submits via `name={fieldKey}` inside a form); keep it module-scoped in the
consumer so React preserves its identity and never resets `defaultValue`.

## Props

```ts
interface ProvFieldProps {
  label: React.ReactNode;
  placeholder?: string;
  /** The form field `name`, and the provenance key the mark reads/writes under. */
  fieldKey: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
  status: "verified" | "unverified" | "estimated" | "disputed";
  sources: SourceOption[];
  /** Fired with the field key plus the new confidence / cited source. */
  onProvChange: (fieldKey: string, status: ProvenanceStatus, sourceLabel?: string, sourceId?: string) => void;
}
```
