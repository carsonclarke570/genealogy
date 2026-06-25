---
category: Forms
---

Switch — an instant on/off toggle (`role="switch"`).

For settings that apply immediately (e.g. a privacy/visibility toggle), as
opposed to a Checkbox in a form you submit. The track fills sienna when on.
Works controlled or uncontrolled.

@example
<Switch label="Show living relatives" defaultChecked />
<Switch label="Public link" checked={isPublic} onChange={setPublic} />

## Props

```ts
interface SwitchProps {
  /** Optional label shown after the track. */
  label?: React.ReactNode;
  /** Controlled on/off state. */
  checked?: boolean;
  /** Uncontrolled initial state. */
  defaultChecked?: boolean;
  /** Called with the next on/off state when toggled. */
  onChange?: (checked: boolean) => void;
  /** Disable the toggle. */
  disabled?: boolean;
  /** Id on the button, e.g. to wire an external `<label htmlFor>`. */
  id?: string;
}
```
