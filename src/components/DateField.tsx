import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
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
  /** Disables the trigger and prevents the picker from opening. */
  disabled?: boolean;
  /** The current value (controlled). `null` is an empty / unknown date. */
  value: PartialDate | null;
  /** Called with the next value. Emits `null` when the field is cleared. */
  onChange: (next: PartialDate | null) => void;
  /** Trigger text shown when the date is empty. @default "Select date" */
  placeholder?: string;
  /** Show a clear (✕) button once anything is entered. @default true */
  clearable?: boolean;
  /** Earliest selectable year. @default 1 */
  minYear?: number;
  /** Latest selectable year. @default the current year */
  maxYear?: number;
  /** Id for the group's label, wired to the trigger. */
  id?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
/** Sunday-first; full names ride along as accessible labels. */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

const PRECISION_ITEMS = [
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
];

const YEARS_PER_PAGE = 12;
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

/** Day of week for a proleptic-Gregorian date (0 = Sunday) via Sakamoto. */
function dayOfWeek(year: number, month: number, day: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = month < 3 ? year - 1 : year;
  return (
    (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + (t[month - 1] ?? 0) + day) % 7
  );
}

/** Move a (year, month, day) by `delta` days without relying on JS `Date` (safe for years < 100). */
function shiftDay(year: number, month: number, day: number, delta: number) {
  let y = year, m = month, d = day + delta;
  while (d < 1) {
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
    d += daysInMonth(y, m);
  }
  while (d > daysInMonth(y, m)) {
    d -= daysInMonth(y, m);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return { year: y, month: m, day: d };
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

/** Which calendar grid to open on, given the target precision and what's known. */
type CalView = "year" | "month" | "day";
function entryView(precision: DatePrecision, v: PartialDate): CalView {
  if (precision === "year" || v.year == null) return "year";
  if (precision === "month" || v.month == null) return "month";
  return "day";
}

/**
 * DateField — a precision-aware calendar picker for facts we may only partly know.
 *
 * Genealogy rarely hands you a whole date: a birth might be pinned to a year, a
 * marriage to a month, a death to the exact day. The trigger opens a popover where
 * a segmented control sets how precise the date is and a drill-down calendar
 * (years → months → days) does the picking — the same drill that lets you reach a
 * century away in two clicks is what records the precision. Days clamp to the
 * chosen month (leap years included). Fully keyboard-operable. Controlled: pass
 * `value` and update it in `onChange`; clearing emits `null`. Pair with
 * {@link formatPartialDate} to render the stored value back as text.
 *
 * @example
 * const [born, setBorn] = useState<PartialDate | null>({
 *   precision: "month", year: 1888, month: 3, day: null,
 * });
 * <DateField
 *   label="Born"
 *   hint="An approximate year is fine — narrow to the month or day if you know them."
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
  placeholder = "Select date",
  clearable = true,
  minYear = 1,
  maxYear,
  id,
}: DateFieldProps) {
  const autoId = useId();
  const groupId = id ?? autoId;
  const labelId = `${groupId}-label`;
  const hintId = `${groupId}-hint`;
  const errorId = `${groupId}-error`;
  const dialogId = `${groupId}-dialog`;
  const gridLabelId = `${groupId}-gridlabel`;
  const invalid = Boolean(error);

  const today = new Date();
  const [ty, tm, td] = [today.getFullYear(), today.getMonth() + 1, today.getDate()];
  const resolvedMax = maxYear ?? ty;

  const v = value ?? EMPTY;
  const { precision } = v;
  const hasValue = v.year != null;
  const describedBy = invalid ? errorId : hint ? hintId : undefined;

  const [open, setOpen] = useState(false);
  // Browsing position inside the calendar — independent of the committed value.
  const [view, setView] = useState<CalView>("year");
  const [cursorYear, setCursorYear] = useState(v.year ?? resolvedMax);
  const [cursorMonth, setCursorMonth] = useState(v.month ?? tm);
  const [yearPage, setYearPage] = useState(0);
  // The cell that owns keyboard focus within the active grid (roving tabindex).
  const [focusKey, setFocusKey] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // When true, the focus effect moves DOM focus to the active cell after render.
  const wantFocus = useRef(false);

  const pageStart = (y: number) => y - ((((y % YEARS_PER_PAGE) + YEARS_PER_PAGE) % YEARS_PER_PAGE));

  const openPicker = () => {
    if (disabled) return;
    const startYear = v.year ?? resolvedMax;
    const startMonth = v.month ?? tm;
    const entry = entryView(precision, v);
    setCursorYear(startYear);
    setCursorMonth(startMonth);
    setYearPage(pageStart(startYear));
    setView(entry);
    setFocusKey(
      entry === "year" ? startYear : entry === "month" ? v.month ?? startMonth : v.day ?? 1,
    );
    wantFocus.current = true;
    setOpen(true);
  };

  const closePicker = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  // Outside-click and Escape dismissal.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closePicker(true);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Move DOM focus onto the active cell after a keyboard nav or a view change.
  useEffect(() => {
    if (!open || !wantFocus.current) return;
    wantFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.focus();
  }, [open, view, cursorYear, cursorMonth, yearPage, focusKey]);

  const emit = (next: PartialDate) => onChange(clampToPrecision(next));

  // Selecting at the active precision's finest grid — terminal: commit and close.
  const commit = (next: PartialDate) => {
    emit(next);
    closePicker(true);
  };

  const setPrecision = (p: string) => {
    const next = clampToPrecision({ ...v, precision: p as DatePrecision });
    emit(next);
    const entry = entryView(p as DatePrecision, next);
    setView(entry);
    wantFocus.current = true;
    setFocusKey(
      entry === "year" ? cursorYear : entry === "month" ? next.month ?? cursorMonth : next.day ?? 1,
    );
  };

  const inRange = (year: number) => year >= minYear && year <= resolvedMax;

  // ── Selection from each grid ───────────────────────────────────────────
  const pickYear = (year: number) => {
    if (!inRange(year)) return;
    setCursorYear(year);
    if (precision === "year") {
      commit({ ...v, precision: "year", year });
      return;
    }
    setView("month");
    wantFocus.current = true;
    setFocusKey(v.month ?? cursorMonth);
  };

  const pickMonth = (month: number) => {
    setCursorMonth(month);
    if (precision === "month") {
      commit({ ...v, precision: "month", year: cursorYear, month });
      return;
    }
    setView("day");
    wantFocus.current = true;
    setFocusKey(Math.min(v.day ?? 1, daysInMonth(cursorYear, month)));
  };

  const pickDay = (day: number) =>
    commit({ precision: "day", year: cursorYear, month: cursorMonth, day });

  // ── Header stepping (the ‹ › arrows) ──────────────────────────────────
  const stepMonth = (delta: number) => {
    let m = cursorMonth + delta, y = cursorYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setCursorMonth(m);
    setCursorYear(y);
  };
  const stepCursorYear = (delta: number) => setCursorYear((y) => y + delta);
  const stepYearPage = (delta: number) => setYearPage((p) => p + delta * YEARS_PER_PAGE);

  const drillUp = () => {
    wantFocus.current = true;
    if (view === "day") {
      setView("month");
      setFocusKey(cursorMonth);
    } else if (view === "month") {
      setYearPage(pageStart(cursorYear));
      setView("year");
      setFocusKey(cursorYear);
    }
  };

  // ── Keyboard handling per grid ────────────────────────────────────────
  const moveFocus = (key: number) => {
    wantFocus.current = true;
    setFocusKey(key);
  };

  const onYearKey = (e: KeyboardEvent) => {
    let next: number | null = focusKey;
    switch (e.key) {
      case "ArrowLeft": next = focusKey - 1; break;
      case "ArrowRight": next = focusKey + 1; break;
      case "ArrowUp": next = focusKey - 3; break;
      case "ArrowDown": next = focusKey + 3; break;
      case "PageUp": next = focusKey - YEARS_PER_PAGE; break;
      case "PageDown": next = focusKey + YEARS_PER_PAGE; break;
      case "Home": next = yearPage; break;
      case "End": next = yearPage + YEARS_PER_PAGE - 1; break;
      case "Enter": case " ": e.preventDefault(); pickYear(focusKey); return;
      default: return;
    }
    e.preventDefault();
    if (next < yearPage) setYearPage((p) => p - YEARS_PER_PAGE);
    else if (next >= yearPage + YEARS_PER_PAGE) setYearPage((p) => p + YEARS_PER_PAGE);
    moveFocus(next);
  };

  const onMonthKey = (e: KeyboardEvent) => {
    let next = focusKey;
    switch (e.key) {
      case "ArrowLeft": next = Math.max(1, focusKey - 1); break;
      case "ArrowRight": next = Math.min(12, focusKey + 1); break;
      case "ArrowUp": next = Math.max(1, focusKey - 3); break;
      case "ArrowDown": next = Math.min(12, focusKey + 3); break;
      case "PageUp": stepCursorYear(-1); e.preventDefault(); return;
      case "PageDown": stepCursorYear(1); e.preventDefault(); return;
      case "Home": next = 1; break;
      case "End": next = 12; break;
      case "Enter": case " ": e.preventDefault(); pickMonth(focusKey); return;
      default: return;
    }
    e.preventDefault();
    moveFocus(next);
  };

  const onDayKey = (e: KeyboardEvent) => {
    const total = daysInMonth(cursorYear, cursorMonth);
    let shifted: { year: number; month: number; day: number } | null = null;
    switch (e.key) {
      case "ArrowLeft": shifted = shiftDay(cursorYear, cursorMonth, focusKey, -1); break;
      case "ArrowRight": shifted = shiftDay(cursorYear, cursorMonth, focusKey, 1); break;
      case "ArrowUp": shifted = shiftDay(cursorYear, cursorMonth, focusKey, -7); break;
      case "ArrowDown": shifted = shiftDay(cursorYear, cursorMonth, focusKey, 7); break;
      case "Home": moveFocus(1); e.preventDefault(); return;
      case "End": moveFocus(total); e.preventDefault(); return;
      case "PageUp": stepMonth(e.shiftKey ? -12 : -1); e.preventDefault(); return;
      case "PageDown": stepMonth(e.shiftKey ? 12 : 1); e.preventDefault(); return;
      case "Enter": case " ": e.preventDefault(); pickDay(focusKey); return;
      default: return;
    }
    e.preventDefault();
    if (shifted) {
      setCursorYear(shifted.year);
      setCursorMonth(shifted.month);
      moveFocus(shifted.day);
    }
  };

  // ── Grid bodies ───────────────────────────────────────────────────────
  const renderYearGrid = () => {
    const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPage + i);
    return (
      <div
        className="fa-cal__grid fa-cal__grid--cells"
        role="grid"
        aria-labelledby={gridLabelId}
        ref={gridRef}
        onKeyDown={onYearKey}
      >
        {years.map((year) => {
          const selected = v.year === year && precision === "year";
          const disabledCell = !inRange(year);
          return (
            <button
              key={year}
              type="button"
              role="gridcell"
              className={`fa-cal__cell fa-cal__cell--wide${selected ? " fa-cal__cell--selected" : ""}`}
              aria-selected={selected || undefined}
              aria-current={year === ty ? "date" : undefined}
              data-active={year === focusKey || undefined}
              tabIndex={year === focusKey ? 0 : -1}
              disabled={disabledCell}
              onClick={() => pickYear(year)}
            >
              {year}
            </button>
          );
        })}
      </div>
    );
  };

  const renderMonthGrid = () => (
    <div
      className="fa-cal__grid fa-cal__grid--cells"
      role="grid"
      aria-labelledby={gridLabelId}
      ref={gridRef}
      onKeyDown={onMonthKey}
    >
      {MONTHS_SHORT.map((name, i) => {
        const month = i + 1;
        const selected =
          v.year === cursorYear && v.month === month && precision === "month";
        return (
          <button
            key={name}
            type="button"
            role="gridcell"
            className={`fa-cal__cell fa-cal__cell--wide${selected ? " fa-cal__cell--selected" : ""}`}
            aria-label={`${MONTHS[i]} ${cursorYear}`}
            aria-selected={selected || undefined}
            aria-current={cursorYear === ty && month === tm ? "date" : undefined}
            data-active={month === focusKey || undefined}
            tabIndex={month === focusKey ? 0 : -1}
            onClick={() => pickMonth(month)}
          >
            {name}
          </button>
        );
      })}
    </div>
  );

  const renderDayGrid = () => {
    const total = daysInMonth(cursorYear, cursorMonth);
    const lead = dayOfWeek(cursorYear, cursorMonth, 1);
    const cells: (number | null)[] = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: total }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    while (cells.length < 42) cells.push(null);
    return (
      <div className="fa-cal__daygrid">
        <div className="fa-cal__weekrow" aria-hidden="true">
          {WEEKDAY_INITIALS.map((d, i) => (
            <span key={WEEKDAYS[i]} className="fa-cal__weekday">{d}</span>
          ))}
        </div>
        <div
          className="fa-cal__grid fa-cal__grid--days"
          role="grid"
          aria-labelledby={gridLabelId}
          ref={gridRef}
          onKeyDown={onDayKey}
        >
          {cells.map((day, i) => {
            if (day == null) return <span key={`pad-${i}`} className="fa-cal__cell fa-cal__cell--pad" aria-hidden="true" />;
            const selected =
              precision === "day" &&
              v.year === cursorYear && v.month === cursorMonth && v.day === day;
            const isToday = cursorYear === ty && cursorMonth === tm && day === td;
            return (
              <button
                key={day}
                type="button"
                role="gridcell"
                className={`fa-cal__cell${selected ? " fa-cal__cell--selected" : ""}${isToday ? " fa-cal__cell--today" : ""}`}
                aria-label={`${day} ${MONTHS[cursorMonth - 1]} ${cursorYear}`}
                aria-selected={selected || undefined}
                aria-current={isToday ? "date" : undefined}
                data-active={day === focusKey || undefined}
                tabIndex={day === focusKey ? 0 : -1}
                onClick={() => pickDay(day)}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Header label + stepping behaviour depend on the active view.
  const header = (() => {
    if (view === "year") {
      const end = yearPage + YEARS_PER_PAGE - 1;
      return {
        title: `${yearPage}–${end}`,
        drillable: false,
        prev: () => stepYearPage(-1),
        next: () => stepYearPage(1),
        prevLabel: "Earlier years",
        nextLabel: "Later years",
      };
    }
    if (view === "month") {
      return {
        title: String(cursorYear),
        drillable: true,
        prev: () => stepCursorYear(-1),
        next: () => stepCursorYear(1),
        prevLabel: "Previous year",
        nextLabel: "Next year",
      };
    }
    return {
      title: `${MONTHS[cursorMonth - 1]} ${cursorYear}`,
      drillable: true,
      prev: () => stepMonth(-1),
      next: () => stepMonth(1),
      prevLabel: "Previous month",
      nextLabel: "Next month",
    };
  })();

  const display = formatPartialDate(value);

  return (
    <div className="fa-field" ref={rootRef}>
      {label && (
        <span className="fa-field__label" id={labelId}>
          {label}
          {required && (
            <span className="fa-field__required" aria-hidden="true">*</span>
          )}
        </span>
      )}

      <div className="fa-datefield">
        <button
          ref={triggerRef}
          type="button"
          id={groupId}
          className={`fa-datefield__trigger${invalid ? " fa-datefield__trigger--invalid" : ""}${!display ? " fa-datefield__trigger--placeholder" : ""}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          aria-labelledby={label ? `${labelId} ${groupId}` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={() => (open ? closePicker(true) : openPicker())}
        >
          <CalendarIcon />
          <span className="fa-datefield__value">{display || placeholder}</span>
          {clearable && hasValue && !disabled && (
            <span
              className="fa-datefield__clear"
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
          )}
        </button>

        {open && (
          <div
            id={dialogId}
            className="fa-cal"
            role="dialog"
            aria-label={label ? undefined : "Choose a date"}
            aria-labelledby={label ? labelId : undefined}
          >
            <SegmentedControl
              size="sm"
              aria-label="How much of the date is known"
              value={precision}
              onValueChange={setPrecision}
              items={PRECISION_ITEMS}
            />

            <div className="fa-cal__nav">
              <button
                type="button"
                className="fa-cal__step"
                aria-label={header.prevLabel}
                onClick={header.prev}
              >
                <NavArrow dir="prev" />
              </button>
              {header.drillable ? (
                <button
                  type="button"
                  className="fa-cal__title fa-cal__title--button"
                  id={gridLabelId}
                  onClick={drillUp}
                  aria-label={`${header.title} — change`}
                >
                  {header.title}
                </button>
              ) : (
                <span className="fa-cal__title" id={gridLabelId} aria-live="polite">
                  {header.title}
                </span>
              )}
              <button
                type="button"
                className="fa-cal__step"
                aria-label={header.nextLabel}
                onClick={header.next}
              >
                <NavArrow dir="next" />
              </button>
            </div>

            <div className="fa-cal__body">
              {view === "year" && renderYearGrid()}
              {view === "month" && renderMonthGrid()}
              {view === "day" && renderDayGrid()}
            </div>

            <div className="fa-cal__foot">
              <span className="fa-cal__preview">{display || "No date set"}</span>
              {hasValue && (
                <button
                  type="button"
                  className="fa-cal__clearlink"
                  onClick={() => { onChange(null); closePicker(true); }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
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
          <span id={hintId} className="fa-field__hint">{hint}</span>
        )
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="fa-datefield__icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="1.75" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 6.25h11M5.25 2v2.5M10.75 2v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function NavArrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={dir === "prev" ? "M10 4l-4 4 4 4" : "M6 4l4 4-4 4"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
