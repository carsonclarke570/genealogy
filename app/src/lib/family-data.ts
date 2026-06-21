/**
 * Domain types and pure view helpers for the family archive.
 *
 * The data itself (people, couple-units, media) now lives in SQLite and is read
 * on the server via lib/queries.ts, then handed to the client through the
 * Dataset context (lib/dataset.tsx). This module holds only the shared types and
 * the pure, data-free helpers the UI renders with. The demo seed literals
 * live in db/seed-data.ts.
 */
import type {
  ProvenanceStatus,
  DocType,
  SourceOption,
  BadgeTone,
  PartialDate,
} from "@family-archive/ui";

export type Sex = "m" | "f" | "o";

/** A recorded fact's confidence, plus the source cited when it's verified. */
export interface ProvFact {
  status: ProvenanceStatus;
  source?: string | null;
}

export interface Person {
  id: string;
  given: string;
  surname: string;
  maiden: string | null;
  sex: Sex;
  /** The 4-digit year (derived from `bornDate`); kept for compact display + sort. */
  born: number | null;
  /** Precision-aware birth date (year / month / day), or null if unknown. */
  bornDate?: PartialDate | null;
  bornPlace: string | null;
  died: number | null;
  diedDate?: PartialDate | null;
  diedPlace: string | null;
  living: boolean;
  notes?: string | null;
  docs: Partial<Record<DocType, number>>;
  prov?: Partial<Record<string, ProvFact>>;
}

export interface Unit {
  id: string;
  parent: string | null;
  anchor: string;
  partner: string | null;
  rel: "married" | "divorced" | null;
}

export interface MediaItem {
  id: string;
  type: DocType;
  title: string;
  year: number;
  people: string[];
}

/** The full in-memory snapshot the UI renders from (assembled in lib/queries.ts). */
export interface Dataset {
  people: Record<string, Person>;
  units: Unit[];
  media: MediaItem[];
}

export function fullName(p: Person): string {
  return `${p.given} ${p.surname}`;
}

/** "Eleanor Margaret Rivers" → "Eleanor Rivers"; first given + surname for tree cells. */
export function shortName(p: Person): string {
  return `${p.given.split(" ")[0]} ${p.surname}`;
}

export function lifeDates(p: Person): string {
  const b = p.born != null ? p.born : "?";
  if (p.living) return `${b} –`;
  const d = p.died != null ? p.died : "?";
  return `${b} – ${d}`;
}

export function docCount(p: Person): number {
  return Object.values(p.docs || {}).reduce<number>((a, b) => a + (b ?? 0), 0);
}

/** Confidence of a single recorded fact. */
export function provOf(p: Person, field: string): ProvenanceStatus {
  const fact = p.prov?.[field];
  if (fact) return fact.status;
  if (field === "name") return docCount(p) > 0 ? "verified" : "unverified";
  if ((field === "born" || field === "died") && p.born && p.born < 1900)
    return "estimated";
  return "unverified";
}

/** The source cited for a recorded fact (when verified), or null. */
export function provSourceOf(p: Person, field: string): string | null {
  return p.prov?.[field]?.source ?? null;
}

export interface Relation {
  id: string;
  rel?: string;
}
export interface Relations {
  spouse: Relation[];
  parents: Relation[];
  children: Relation[];
  siblings: Relation[];
}

export function relationsOf(units: Unit[], pid: string): Relations {
  const uOf: Record<string, Unit> = {};
  units.forEach((u) => {
    uOf[u.anchor] = u;
    if (u.partner) uOf[u.partner] = u;
  });
  const myUnit = uOf[pid];
  const out: Relations = { spouse: [], parents: [], children: [], siblings: [] };
  if (!myUnit) return out;
  const isAnchor = myUnit.anchor === pid;
  if (myUnit.partner) {
    const other = isAnchor ? myUnit.partner : myUnit.anchor;
    out.spouse.push({ id: other, rel: myUnit.rel ?? undefined });
  }
  if (isAnchor && myUnit.parent) {
    const pu = units.find((u) => u.id === myUnit.parent);
    if (pu) {
      out.parents.push({ id: pu.anchor });
      if (pu.partner) out.parents.push({ id: pu.partner });
      units
        .filter((u) => u.parent === myUnit.parent && u.id !== myUnit.id)
        .forEach((u) => out.siblings.push({ id: u.anchor }));
    }
  }
  units
    .filter((u) => u.parent === myUnit.id)
    .forEach((u) => out.children.push({ id: u.anchor }));
  return out;
}

export interface ProvSummary {
  key: "disputed" | "sourced" | "needs";
  tone: BadgeTone;
  color: string;
  icon: "alert" | "check" | "ring";
  label: string;
}

/** Roll a person's fact confidences into one record-level summary. */
export function provSummary(p: Person): ProvSummary {
  const fields = ["name", "born", "bornPlace"].concat(
    p.living ? [] : ["died", "diedPlace"]
  );
  const st = fields.map((f) => provOf(p, f));
  if (st.some((s) => s === "disputed"))
    return { key: "disputed", tone: "danger", color: "var(--color-danger)", icon: "alert", label: "Disputed facts" };
  if (st.every((s) => s === "verified"))
    return { key: "sourced", tone: "success", color: "var(--color-success)", icon: "check", label: "Fully sourced" };
  return { key: "needs", tone: "warning", color: "var(--color-warning)", icon: "ring", label: "Needs sources" };
}

/** The archive documents offered by the SourceCite dialog. */
export function sourceOptions(media: MediaItem[]): SourceOption[] {
  return media.slice(0, 6).map((m) => ({ id: m.id, label: m.title, type: m.type }));
}
