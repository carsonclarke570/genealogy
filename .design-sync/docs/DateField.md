---
category: Forms
---

DateField — a precision-aware calendar picker for facts we may only partly know.

Genealogy rarely hands you a whole date: a birth might be pinned to a year, a
marriage to a month, a death to the exact day. The trigger opens a popover where
a segmented control sets how precise the date is and a drill-down calendar
(years → months → days) does the picking — the same drill that lets you reach a
century away in two clicks is what records the precision. Days clamp to the
chosen month (leap years included). Fully keyboard-operable. Controlled: pass
`value` and update it in `onChange`; clearing emits `null`. Pair with
{@link formatPartialDate} to render the stored value back as text.

@example
const [born, setBorn] = useState<PartialDate | null>({
  precision: "month", year: 1888, month: 3, day: null,
});
<DateField
  label="Born"
  hint="An approximate year is fine — narrow to the month or day if you know them."
  value={born}
  onChange={setBorn}
/>

## Props

```ts
interface DateFieldProps {
  /** Field label rendered above the control. */
  label?: React.ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: React.ReactNode;
  /** Error message. Sets the invalid styling, `aria-invalid`, and replaces the hint. */
  error?: React.ReactNode;
  /** Marks the field required and shows a sienna asterisk on the label. */
  required?: boolean;
  /** Disables the trigger and prevents the picker from opening. */
  disabled?: boolean;
  /** The current value (controlled). `null` is an empty / unknown date. */
  value: PartialDate;
  /** Called with the next value. Emits `null` when the field is cleared. */
  onChange: (next: PartialDate | null) => void;
  /** Trigger text shown when the date is empty. */
  placeholder?: string;
  /** Show a clear (✕) button once anything is entered. */
  clearable?: boolean;
  /** Earliest selectable year. */
  minYear?: number;
  /** Latest selectable year. */
  maxYear?: number;
  /** Id for the group's label, wired to the trigger. */
  id?: string;
}
```
