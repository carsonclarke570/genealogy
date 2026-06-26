/**
 * Stage 2 of the upload wizard: who does this document mention?
 *
 * Pick people already in the archive, or quickly add someone the document
 * introduces — with an optional connection (a relationship to an existing person
 * or another new subject). Each subject added here gets its own Update stage.
 */
"use client";

import { useState } from "react";
import { Avatar, Badge, Button, Input, MultiSelect, Select } from "@family-archive/ui";
import type { Dataset } from "@/lib/family-data";
import { fullName, lifeDates } from "@/lib/family-data";
import { model as registryModel, SEX, type CollectionModel, type CollItem } from "@/lib/staged-upload/registry";
import type { NewPersonSpec } from "@/lib/staged-upload/payload";
import { Icon } from "../Icon";
import { ItemFields } from "./fields";
import { buildCtx, makeExistingSubject, makeNewSubject, type Subject } from "./shared";

const relsModel = registryModel("rels") as CollectionModel;

let tempCounter = 0;
const newTempId = () => `new-${Date.now().toString(36)}-${tempCounter++}`;

const blankConn = (): CollItem => ({ _id: "conn", _new: true, _existing: false, _removed: false, type: "", person: "", status: null, date: null });

export function PeopleStage({
  dataset,
  subjects,
  onSubjects,
  lockedUid,
}: {
  dataset: Dataset;
  subjects: Subject[];
  onSubjects: (next: Subject[]) => void;
  /** A subject opened from a person record — kept selected, not removable. */
  lockedUid?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [np, setNp] = useState({ given: "", surname: "", sex: "f" as "m" | "f" | "o", born: "" });
  const [conn, setConn] = useState<CollItem>(blankConn);

  const ctx = buildCtx(dataset, subjects);
  const existingUids = subjects.filter((s) => s.kind === "existing").map((s) => s.uid);

  const setExisting = (ids: string[]) => {
    // Keep new subjects + the locked one; reconcile the existing selection.
    const next = ids.includes(lockedUid ?? "") || !lockedUid ? ids : [lockedUid, ...ids];
    const kept = subjects.filter((s) => s.kind === "new" || next.includes(s.uid));
    const have = kept.map((s) => s.uid);
    const added = next
      .filter((id) => !have.includes(id) && dataset.people[id])
      .map((id) => makeExistingSubject(dataset, dataset.people[id]));
    onSubjects(kept.concat(added));
  };

  const peopleOpts = Object.values(dataset.people).map((p) => ({
    value: p.id,
    label: fullName(p),
    description: lifeDates(p),
    leading: <Avatar name={fullName(p)} size="sm" />,
  }));

  const resetNew = () => {
    setNp({ given: "", surname: "", sex: "f", born: "" });
    setConn(blankConn());
    setAdding(false);
  };

  const commitNew = () => {
    if (!np.given.trim() && !np.surname.trim()) return;
    const spec: NewPersonSpec = {
      tempId: newTempId(),
      given: np.given.trim() || "Unknown",
      surname: np.surname.trim() || "Unknown",
      sex: np.sex,
      bornYear: np.born ? parseInt(np.born, 10) || null : null,
    };
    const subject = makeNewSubject(spec);
    if (conn.type && conn.person) {
      subject.draft.rels = [{ ...conn, _id: `c-${spec.tempId}` }];
    }
    onSubjects(subjects.concat([subject]));
    resetNew();
  };

  return (
    <div className="app-stagebody">
      <div className="app-stage-h">Who does this document mention?</div>
      <p className="app-muted app-stage-sub">
        Each person you add gets their own update step. Pick people already in the archive, or add someone new the document introduces.
      </p>

      <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
        People already in the archive
      </div>
      <MultiSelect
        aria-label="People in this record"
        placeholder="Search people…"
        selected={existingUids}
        onChange={setExisting}
        options={peopleOpts}
        summary={(n) => (n === 0 ? "Search people…" : `${n} ${n === 1 ? "person" : "people"}`)}
      />

      <div className="app-subjects">
        {subjects.map((s) => {
          const locked = s.uid === lockedUid;
          return (
            <div key={s.uid} className="app-subjchip">
              <Avatar name={fullName(s.person)} size="sm" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="app-subjchip-nm">
                  {fullName(s.person)}
                  {s.kind === "new" && (
                    <Badge tone="info" style={{ marginLeft: 6 }}>
                      New
                    </Badge>
                  )}
                </div>
                <div className="app-muted" style={{ fontSize: "var(--text-label)" }}>
                  {lifeDates(s.person)}
                </div>
              </div>
              {!locked && (
                <button
                  type="button"
                  className="app-ptag-x"
                  aria-label={`Remove ${fullName(s.person)}`}
                  onClick={() => onSubjects(subjects.filter((x) => x.uid !== s.uid))}
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          );
        })}
        {subjects.length === 0 && <div className="app-coll-empty">No one added yet — a document needs at least one subject.</div>}
      </div>

      {!adding ? (
        <Button variant="secondary" size="sm" iconStart={<Icon name="plus" size={15} />} onClick={() => setAdding(true)}>
          Add a new person
        </Button>
      ) : (
        <div className="app-newperson">
          <div className="app-newperson-h">
            <Icon name="plus" size={15} /> New person
          </div>
          <div className="app-fgrid">
            <div style={{ minWidth: 0 }}>
              <Input label="Given names" value={np.given} onChange={(e) => setNp({ ...np, given: e.target.value })} placeholder="e.g. Henry" />
            </div>
            <div style={{ minWidth: 0 }}>
              <Input label="Surname" value={np.surname} onChange={(e) => setNp({ ...np, surname: e.target.value })} placeholder="e.g. Whitfield" />
            </div>
            <div style={{ minWidth: 0 }}>
              <Select label="Sex" value={np.sex} onChange={(e) => setNp({ ...np, sex: e.target.value as "m" | "f" | "o" })}>
                {SEX.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div style={{ minWidth: 0 }}>
              <Input label="Birth year" inputMode="numeric" value={np.born} onChange={(e) => setNp({ ...np, born: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div className="app-newperson-conn">
            <div className="app-label-sm" style={{ marginBottom: 6 }}>
              Connection <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>(optional)</span>
            </div>
            <ItemFields model={relsModel} item={conn} ctx={ctx} onChange={(patch) => setConn((c) => ({ ...c, ...patch }))} />
          </div>
          <div className="app-newperson-actions">
            <Button variant="ghost" size="sm" onClick={resetNew}>
              Cancel
            </Button>
            <Button variant="secondary" size="sm" onClick={commitNew}>
              Add person
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
