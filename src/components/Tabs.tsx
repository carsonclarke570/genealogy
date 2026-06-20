import { useId, useState } from "react";
import type { ReactNode } from "react";

export interface TabItem {
  /** Stable identifier for this tab. */
  value: string;
  /** Tab label shown in the tablist. */
  label: ReactNode;
  /** Panel content shown when this tab is active. */
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  /** The tabs and their panels. */
  items: TabItem[];
  /** Initially active tab when uncontrolled. Defaults to the first tab. */
  defaultValue?: string;
  /** Controlled active tab. */
  value?: string;
  /** Called with the new value when a tab is selected. */
  onValueChange?: (value: string) => void;
}

/**
 * Tabs — switch between related panels of a record (Overview / Documents / Notes).
 *
 * Works uncontrolled (`defaultValue`) or controlled (`value` + `onValueChange`).
 * The active tab carries a sienna underline; tablist/tab/tabpanel roles and
 * `aria-selected`/`aria-controls` are wired for assistive tech.
 *
 * @example
 * <Tabs
 *   defaultValue="overview"
 *   items={[
 *     { value: "overview", label: "Overview", content: <Overview /> },
 *     { value: "documents", label: "Documents", content: <Docs /> },
 *   ]}
 * />
 */
export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
}: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;
  const activeItem = items.find((i) => i.value === active);

  const select = (v: string) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };

  return (
    <div className="fa-tabs">
      <div className="fa-tablist" role="tablist">
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            role="tab"
            id={`${baseId}-tab-${it.value}`}
            aria-selected={it.value === active}
            aria-controls={`${baseId}-panel-${it.value}`}
            tabIndex={it.value === active ? 0 : -1}
            disabled={it.disabled}
            className="fa-tab"
            onClick={() => select(it.value)}
          >
            {it.label}
          </button>
        ))}
      </div>
      {activeItem && (
        <div
          className="fa-tabpanel"
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.value}`}
          aria-labelledby={`${baseId}-tab-${activeItem.value}`}
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
