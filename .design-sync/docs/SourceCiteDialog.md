---
category: Genealogy
---

SourceCiteDialog — the "Link a source" step behind marking a fact verified.

Records are sacred: a verified fact must cite the document that proves it.
Lists existing archive documents as a single-select radio group (plus an
"upload a new document" affordance), and confirms with the chosen citation.

@example
<SourceCiteDialog open={open} sources={docs}
  onClose={close} onConfirm={(src) => markVerified(src)} />

## Props

```ts
interface SourceCiteDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called once the user confirms, with the chosen source's label and id. `id` is `"__new"` when they chose to upload a new  */
  onConfirm: (source: string, id?: string) => void;
  /** Documents already in the archive that can prove the fact. */
  sources?: SourceOption[];
}
```
