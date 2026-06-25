---
category: Forms
---

RadioGroup — a single choice from a small set (native radios, accent-colored).

A `<fieldset>` + `<legend>` for correct grouping semantics. Works controlled
(`value` + `onChange`) or uncontrolled (`defaultValue`). Use for mutually
exclusive choices like relationship type or visibility level.

@example
<RadioGroup legend="Relationship" defaultValue="parent" options={[
  { value: "parent", label: "Parent" },
  { value: "spouse", label: "Spouse / partner" },
]} />

## Props

```ts
interface RadioGroupProps {
  /** Group label (the fieldset legend). */
  legend: React.ReactNode;
  /** Shared input name; auto-generated if omitted. */
  name?: string;
  options: RadioOption[];
  /** Controlled selected value. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  onChange?: (value: string) => void;
}
```
