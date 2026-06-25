---
category: Genealogy
---

ProvenanceMark — the confidence mark beside a recorded fact.

The product's signature idea: every fact carries its provenance. Four states
(`verified` / `unverified` / `estimated` / `disputed`), each a colour + icon +
label so meaning never rides on colour alone. Read-only by default (a Tooltip
explains the state and its source); pass `onChange` to make it editable — a
Menu picks the confidence and "Verified" opens the source-citation dialog.

@example
// read-only, beside a date
<ProvenanceMark status="verified" source="birth certificate" />

@example
// editable, in the add-person form
<ProvenanceMark status={st} sources={docs} onChange={(s, src) => save(s, src)} />

## Props

```ts
interface ProvenanceMarkProps {
  /** Confidence of the recorded fact. */
  status?: "verified" | "unverified" | "estimated" | "disputed";
  /** The citation appended to the read-only tooltip and accessible name (e.g. "birth certificate"); when omitted the state's  */
  source?: string;
  /** Presence makes the mark editable: clicking opens a confidence picker, and choosing "Verified" opens the {@link SourceCit */
  onChange?: (status: ProvenanceStatus, source?: string, sourceId?: string) => void;
  /** Candidate documents offered by the "Link a source" dialog. */
  sources?: SourceOption[];
  /** Icon size in px. */
  size?: number;
  className?: string;
}
```
