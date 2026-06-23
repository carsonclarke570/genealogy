/**
 * Storage <-> UI bridge for precision-aware genealogical dates.
 *
 * The design-system `DateField` works in {@link PartialDate} objects
 * ({ precision, year, month, day }); the database stores a single compact,
 * sortable string. These helpers convert between the two and derive the plain
 * 4-digit year the schema keeps alongside for sorting, search, and compact
 * display.
 *
 * Canonical stored form (precision implied by how many components are present):
 *   - year  → "YYYY"        (e.g. "1888")
 *   - month → "YYYY-MM"     (e.g. "1888-03")
 *   - day   → "YYYY-MM-DD"  (e.g. "1888-03-12")
 * An empty/unknown date is `null` (no string).
 */
import type { PartialDate } from "@family-archive/ui";

/**
 * How a residence's dates are meant to be read — the single source of truth
 * shared by the schema (residence.date_kind), the read model, and the write path.
 *   - "range": a span — `start` is when they moved in, `end` when they moved out
 *              (null end = lived there onward / "present").
 *   - "point": a single *known* date — we only know they lived there around then,
 *              not the move-in/move-out. `start` holds that date; `end` is unused.
 * The distinction can't be inferred from the data ("a start with no end" is
 * genuinely ambiguous between "still there" and "only known then"), so it is
 * stored explicitly.
 */
export const residenceDateKinds = ["range", "point"] as const;
export type ResidenceDateKind = (typeof residenceDateKinds)[number];

const pad = (n: number, len: number) => String(n).padStart(len, "0");

/**
 * Serialise a {@link PartialDate} to its canonical stored string, or `null` when
 * the date is empty. Only the components actually known are emitted, so a "day"
 * precision with no month collapses to just the year.
 */
export function serializePartialDate(date: PartialDate | null | undefined): string | null {
  if (!date || date.year == null) return null;
  const year = pad(date.year, 4);
  if (date.precision === "year" || date.month == null) return year;
  const month = `${year}-${pad(date.month, 2)}`;
  if (date.precision === "month" || date.day == null) return month;
  return `${month}-${pad(date.day, 2)}`;
}

/** Parse a canonical stored string back into a {@link PartialDate}, or `null`. */
export function parsePartialDate(raw: string | null | undefined): PartialDate | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : null;
  const day = m[3] ? Number(m[3]) : null;
  const precision = day != null ? "day" : month != null ? "month" : "year";
  return { precision, year, month, day };
}

/** The plain 4-digit year a partial date pins down, or `null`. */
export function yearOf(raw: string | null | undefined): number | null {
  return parsePartialDate(raw)?.year ?? null;
}
