import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnchoredPopover } from "./AnchoredPopover";
import type { ComboboxOption } from "./Combobox";

export interface MultiComboboxProps {
  /** The options to search and choose from. */
  options: ComboboxOption[];
  /** Currently selected values (controlled). */
  value: string[];
  /** Called with the next selection when an option is toggled or a chip removed. */
  onChange: (next: string[]) => void;
  /** Field label rendered above the control. */
  label?: ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: ReactNode;
  /** Error message. Sets the invalid styling, `aria-invalid`, and replaces the hint. */
  error?: ReactNode;
  /** Marks the field required and shows a danger asterisk on the label. */
  required?: boolean;
  /** Input placeholder. @default "Search…" */
  placeholder?: string;
  /** Message shown when the query matches no options. @default "No matches" */
  emptyMessage?: ReactNode;
  /** Disable the control. */
  disabled?: boolean;
  /** When set, a hidden input of this `name` carries the JSON-encoded ids for native form submit. */
  name?: string;
  /** Accessible name for the input when there is no visible `label`. */
  "aria-label"?: string;
  /** Force the panel open (for previews / controlled use). */
  open?: boolean;
  /** Popover panel width in px; defaults to matching the control. */
  panelWidth?: number;
}

/** Flatten a node to searchable text (strings only; ignores elements). */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return "";
}

/**
 * MultiCombobox — a searchable multi-select. Type to filter, arrow keys to move,
 * Enter to toggle; the panel stays open while you add several, and chosen items
 * appear as removable chips beneath the field.
 *
 * It's the multi-value sibling of `Combobox`: same look, same portaled popover,
 * same label/hint/error contract — for the case where a field holds *several*
 * picks out of a long, searchable list (the people linked to a record, the
 * residents of a home). Unlike `MultiSelect` (a count-summary filter popover with
 * no search), this filters as you type. Controlled: pass `value` and update it in
 * `onChange`. Closes on outside-click or Escape; toggling never closes it.
 *
 * @example
 * <MultiCombobox
 *   label="People"
 *   placeholder="Search people…"
 *   value={ids}
 *   onChange={setIds}
 *   options={people.map((p) => ({
 *     value: p.id,
 *     label: p.name,
 *     description: p.lifeDates,
 *     leading: <Avatar name={p.name} size="sm" />,
 *   }))}
 * />
 */
export function MultiCombobox({
  options,
  value,
  onChange,
  label,
  hint,
  error,
  required,
  placeholder = "Search…",
  emptyMessage = "No matches",
  disabled,
  name,
  panelWidth,
  open: openProp,
  "aria-label": ariaLabel,
}: MultiComboboxProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const controlled = openProp !== undefined;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const autoId = useId();
  const inputId = `${autoId}-input`;
  const listId = `${autoId}-list`;
  const hintId = `${autoId}-hint`;
  const errorId = `${autoId}-error`;
  const invalid = Boolean(error);

  const byValue = useMemo(() => {
    const m = new Map<string, ComboboxOption>();
    for (const o of options) m.set(o.value, o);
    return m;
  }, [options]);

  // Selected chips, in selection order, skipping ids no longer in `options`.
  const chips = useMemo(
    () => value.map((v) => byValue.get(v)).filter((o): o is ComboboxOption => Boolean(o)),
    [value, byValue],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${textOf(o.label)} ${textOf(o.description)} ${o.keywords ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  // Keep the active option in range as the filtered list changes.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    if (!open || controlled) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      // The panel is portaled out of rootRef, so treat it as "inside" too.
      if (!rootRef.current?.contains(t) && !popRef.current?.contains(t)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, controlled]);

  function openPanel() {
    if (disabled) return;
    setActive(0);
    setInternalOpen(true);
  }
  function close() {
    setInternalOpen(false);
    setQuery("");
  }
  function toggle(opt: ComboboxOption) {
    onChange(
      value.includes(opt.value)
        ? value.filter((v) => v !== opt.value)
        : value.concat(opt.value),
    );
    // Stay open and clear the query so the next name can be typed straight away.
    setQuery("");
    inputRef.current?.focus();
  }
  function remove(v: string) {
    onChange(value.filter((id) => id !== v));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) return openPanel();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[active]) {
        e.preventDefault();
        toggle(filtered[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        close();
      }
    } else if (e.key === "Backspace" && query === "" && value.length > 0) {
      // Empty query: backspace peels off the last chip, like a token input.
      e.preventDefault();
      const last = value[value.length - 1];
      if (last !== undefined) remove(last);
    }
  }

  const classes = ["fa-combobox__control", invalid && "fa-combobox__control--invalid"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fa-field">
      {label && (
        <label className="fa-field__label" htmlFor={inputId}>
          {label}
          {required && (
            <span className="fa-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="fa-combobox" ref={rootRef}>
        {name && <input type="hidden" name={name} value={JSON.stringify(value)} />}
        <div className={classes}>
          <input
            ref={inputRef}
            id={inputId}
            className="fa-combobox__input"
            role="combobox"
            type="text"
            autoComplete="off"
            aria-label={!label ? ariaLabel : undefined}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            aria-activedescendant={
              open && filtered[active] ? `${listId}-${filtered[active].value}` : undefined
            }
            aria-describedby={invalid ? errorId : hint ? hintId : undefined}
            disabled={disabled}
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setInternalOpen(true);
            }}
            onFocus={openPanel}
            onClick={openPanel}
            onKeyDown={onKeyDown}
          />
          <svg
            className="fa-combobox__caret"
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <AnchoredPopover
          anchorRef={rootRef}
          open={open}
          width={panelWidth}
          className="fa-combobox__pop"
          popRef={popRef}
        >
          <ul
            className="fa-combobox__list"
            id={listId}
            role="listbox"
            aria-multiselectable="true"
          >
            {filtered.length === 0 ? (
              <li className="fa-combobox__empty" role="presentation">
                {emptyMessage}
              </li>
            ) : (
              filtered.map((opt, i) => {
                const on = value.includes(opt.value);
                const isActive = i === active;
                return (
                  <li
                    key={opt.value}
                    id={`${listId}-${opt.value}`}
                    role="option"
                    aria-selected={on}
                  >
                    <button
                      type="button"
                      className={
                        "fa-combobox__option" +
                        (isActive ? " fa-combobox__option--active" : "") +
                        (on ? " fa-combobox__option--on" : "")
                      }
                      onMouseEnter={() => setActive(i)}
                      onClick={() => toggle(opt)}
                    >
                      {opt.leading && <span className="fa-combobox__leading">{opt.leading}</span>}
                      <span className="fa-combobox__text">
                        <span className="fa-combobox__label">{opt.label}</span>
                        {opt.description && (
                          <span className="fa-combobox__desc">{opt.description}</span>
                        )}
                      </span>
                      <span className="fa-combobox__check" aria-hidden="true">
                        {on && (
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </AnchoredPopover>

        {chips.length > 0 && (
          <ul className="fa-multicombo__chips">
            {chips.map((opt) => {
              const chipName = textOf(opt.label);
              return (
                <li key={opt.value} className="fa-multicombo__chip">
                  {opt.leading && (
                    <span className="fa-multicombo__chip-leading" aria-hidden="true">
                      {opt.leading}
                    </span>
                  )}
                  <span className="fa-multicombo__chip-label">{opt.label}</span>
                  <button
                    type="button"
                    className="fa-multicombo__chip-remove"
                    aria-label={chipName ? `Remove ${chipName}` : "Remove"}
                    disabled={disabled}
                    onClick={() => remove(opt.value)}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {invalid ? (
        <span id={errorId} className="fa-field__error" role="alert">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.9" fill="currentColor" />
          </svg>
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="fa-field__hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
