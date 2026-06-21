import { useId } from "react";
import type { ReactNode } from "react";
import { SegmentedControl } from "./SegmentedControl";

/** How much of a date is actually known. */
export type DatePrecision = "year" | "month" | "day";

/**
 * A genealogical date that may be known only to the year, the month, or the full
 * day. `month` (1–12) is meaningful only at month/day precision; `day` (1–31)
 * only at day precision. A `null` year means the date is empty / unknown.
 */
export interface PartialDate {
  precision: DatePrecision;
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface DateFieldProps {
  /** Field label rendered above the control. */
  label?: ReactNode;
  /** Helper text shown beneath the control when there is no error. */
  hint?: ReactNode;
  /** Error message. Sets the invalid styling, `aria-invalid`, and replaces the hint. */
  error?: ReactNode;
  /** Marks the field required and shows a sienna asterisk on the label. */
  required?: boolean;
  /** Disables every control in the group. */
  disabled?: boolean;
  /** The current value (controlled). `null` is an empty / unknown date. */
  value: PartialDate | null;
  /** Called with the next value. Emits `null` when the field is cleared. */
  onChange: (next: PartialDate | null) => void;
  /** Show a clear (✕) button once anything is entered. @default true */
  clearable?: boolean;
  /** Earliest accepted year. @default 1 */
  minYear?: number;
  /** Latest accepted year. @default the current year */
  maxYear?: number;
  /** Id for the group's label, wired to the year input. */
  id?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PRECISION_ITEMS = [
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
];

const EMPTY: PartialDate = { precision: "year", year: null, month: null, day: null };

/** Days in a (1-based) month; Feb with an unknown year is treated as a leap 29. */
function daysInMonth(year: number | null, month: number | null): number {
  if (!month) return 31;
  if (month === 2) {
    if (year == null) return 29;
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  }
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 31;
}

/** Drop fields finer than `precision` allows so the value stays well-formed. */
function clampToPrecision(date: PartialDate): PartialDate {
  const next = { ...date };
  if (next.precision === "year") next.month = null;
  if (next.precision !== "day") next.day = null;
  if (next.day != null) {
    const max = daysInMonth(next.year, next.month);
    if (next.day > max) next.day = max;
  }
  return next;
}

/**
 * Format a {@link PartialDate} as plain text — `"1888"`, `"March 1888"`, or
 * `"12 March 1888"` — honouring its precision. Returns `""` for an empty date.
 */
export function formatPartialDate(value: PartialDate | null): string {
  if (!value || value.year == null) return "";
  if (value.precision === "year" || value.month == null) return String(value.year);
  const month = MONTHS[value.month - 1];
  if (value.precision === "month" || value.day == null) return `${month} ${value.year}`;
  return `${value.day} ${month} ${value.year}`;
}

/**
 * DateField — a precision-aware date entry for facts we may only partly know.
 *
 * Genealogy rarely hands you a whole date: a birth might be pinned to a year, a
 * marriage to a month, a death to the exact day. The segmented control sets how
 * precise the date is; the fields adapt — year alone, year + month, or the full
 * day — so a record never has to claim more certainty than it has. Days clamp to
 * the chosen month (leap years included). Controlled: pass `value` and update it
 * in `onChange`; clearing emits `null`. Pair with {@link formatPartialDate} to
 * render the stored value back as text.
 *
 * @example
 * const [born, setBorn] = useState<PartialDate | null>({
 *   precision: "month", year: 1888, month: 3, day: null,
 * });
 * <DateField
 *   label="Born"
 *   hint="An approximate year is fine — add the month or day if you know them."
 *   value={born}
 *   onChange={setBorn}
 * />
 */
export function DateField({
  label,
  hint,
  error,
  required,
  disabled,
  value,
  onChange,
  clearable = true,
  minYear = 1,
  maxYear,
  id,
}: DateFieldProps) {
  const autoId = useId();
  const groupId = id ?? autoId;
  const labelId = `${groupId}-label`;
  const yearId = `${groupId}-year`;
  const hintId = `${groupId}-hint`;
  const errorId = `${groupId}-error`;
  const invalid = Boolean(error);

  const v = value ?? EMPTY;
  const { precision } = v;
  const hasValue = v.year != null || v.month != null || v.day != null;
  const describedBy = invalid ? errorId : hint ? hintId : undefined;

  const emit = (next: PartialDate) => onChange(clampToPrecision(next));

  const setPrecision = (p: string) =>
    emit({ ...v, precision: p as DatePrecision });

  const setYear = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits === "") return emit({ ...v, year: null });
    const ceiling = maxYear ?? new Date().getFullYear();
    const year = Math.min(Math.max(Number(digits), minYear), ceiling);
    emit({ ...v, year });
  };

  const setMonth = (raw: string) =>
    emit({ ...v, month: raw === "" ? null : Number(raw) });

  const setDay = (raw: string) =>
    emit({ ...v, day: raw === "" ? null : Number(raw) });

  const dayCount = daysInMonth(v.year, v.month);

  return (
    <div className="fa-field">
      {label && (
        <span className="fa-field__label" id={labelId}>
          {label}
          {required && (
            <span className="fa-field__required" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}

      <div
        className="fa-datefield"
        role="group"
        aria-labelledby={label ? labelId : undefined}
      >
        <SegmentedControl
          size="sm"
          aria-label="Date precision"
          value={precision}
          onValueChange={setPrecision}
          items={PRECISION_ITEMS.map((it) => ({ ...it, disabled }))}
        />

        <div className="fa-datefield__fields">
          <input
            id={yearId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={`fa-input fa-datefield__year${invalid ? " fa-input--invalid" : ""}`}
            placeholder="YYYY"
            aria-label="Year"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            disabled={disabled}
            value={v.year ?? ""}
            onChange={(e) => setYear(e.target.value)}
          />

          {precision !== "year" && (
            <span className="fa-select-wrap fa-datefield__month" key="month">
              <select
                className={`fa-select${invalid ? " fa-select--invalid" : ""}`}
                aria-label="Month"
                aria-invalid={invalid || undefined}
                disabled={disabled}
                value={v.month ?? ""}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <Chevron />
            </span>
          )}

          {precision === "day" && (
            <span className="fa-select-wrap fa-datefield__day" key="day">
              <select
                className={`fa-select${invalid ? " fa-select--invalid" : ""}`}
                aria-label="Day"
                aria-invalid={invalid || undefined}
                disabled={disabled}
                value={v.day ?? ""}
                onChange={(e) => setDay(e.target.value)}
              >
                <option value="">Day</option>
                {Array.from({ length: dayCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <Chevron />
            </span>
          )}

          {clearable && hasValue && !disabled && (
            <button
              type="button"
              className="fa-datefield__clear"
              aria-label="Clear date"
              onClick={() => onChange(null)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
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

function Chevron() {
  return (
    <svg
      className="fa-select__chevron"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
