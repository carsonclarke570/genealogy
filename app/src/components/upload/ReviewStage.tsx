/**
 * Final stage of the upload wizard: a grouped change summary, the verified-source
 * note, danger warnings that require an explicit acknowledgment, and a per-person
 * breakdown of every change about to be written.
 */
"use client";

import { Avatar, Badge, Callout, Checkbox, DocChip } from "@family-archive/ui";
import type { DocType } from "@family-archive/ui";
import { fullName } from "@/lib/family-data";
import { subjectChanges, type ChangeOp } from "@/lib/staged-upload/diff";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";
import type { DocFields } from "./DocStage";
import type { Subject, UploadCtx } from "./shared";

const OP_ICON: Record<ChangeOp, IconName> = { set: "edit", update: "edit", add: "plus", remove: "trash" };
const OP_WORD: Record<ChangeOp, string> = { set: "Update", update: "Update", add: "Add", remove: "Remove" };

export function ReviewStage({
  doc,
  subjects,
  ctx,
  ack,
  setAck,
}: {
  doc: DocFields;
  subjects: Subject[];
  ctx: UploadCtx;
  ack: boolean;
  setAck: (v: boolean) => void;
}) {
  const perSubject = subjects.map((s) => ({ s, changes: subjectChanges(s.person, s.draft, ctx) }));
  const totalChanges = perSubject.reduce((a, x) => a + x.changes.length, 0);
  const newPeople = subjects.filter((s) => s.kind === "new");
  const dangers = perSubject.flatMap(({ s, changes }) =>
    changes.filter((c) => c.danger).map((c) => ({ who: fullName(s.person), label: c.label, msg: c.danger as string })),
  );

  return (
    <div className="app-stagebody">
      <div className="app-stage-h">Review &amp; upload</div>

      <div className="app-review-doc">
        <div className="app-review-doc-ic">
          <Icon name="file" size={18} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "var(--text-body)", color: "var(--color-ink)", fontWeight: 600 }}>{doc.title || "Untitled document"}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
            <DocChip type={doc.type as DocType} />
            {doc.year && (
              <span className="app-muted" style={{ fontSize: "var(--text-body-sm)", fontFeatureSettings: '"tnum" 1' }}>
                {doc.year}
              </span>
            )}
            <Badge tone="success" dot>
              Verified
            </Badge>
          </div>
        </div>
      </div>

      <div className="app-review-summary">
        <span>
          <strong>{totalChanges}</strong> {totalChanges === 1 ? "change" : "changes"}
        </span>
        <span className="app-dot-sep" />
        <span>
          <strong>{subjects.length}</strong> {subjects.length === 1 ? "person" : "people"}
        </span>
        {newPeople.length > 0 && (
          <>
            <span className="app-dot-sep" />
            <span>
              <strong>{newPeople.length}</strong> new
            </span>
          </>
        )}
      </div>

      <Callout tone="success">
        Every change is recorded as <strong>Verified</strong>, cited to this document.
      </Callout>

      {dangers.length > 0 && (
        <Callout
          tone="warning"
          role="alert"
          title={`${dangers.length} ${dangers.length === 1 ? "change needs" : "changes need"} your confirmation`}
        >
          <ul className="app-danger-list">
            {dangers.map((d, i) => (
              <li key={i}>
                <div className="app-danger-what">
                  <strong>{d.who}</strong> — {d.label}
                </div>
                <div className="app-danger-why">{d.msg}</div>
              </li>
            ))}
          </ul>
          <Checkbox
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            label="I understand these changes may cascade across the tree and timeline, and I want to apply them."
          />
        </Callout>
      )}

      <div className="app-review-people">
        {perSubject.map(({ s, changes }) => (
          <div key={s.uid} className="app-review-person">
            <div className="app-review-person-h">
              <Avatar name={fullName(s.person)} size="sm" />
              <span className="app-display" style={{ fontSize: "var(--text-body)" }}>
                {fullName(s.person)}
              </span>
              {s.kind === "new" && <Badge tone="info">New person</Badge>}
              <div style={{ flex: 1 }} />
              <span className="app-muted" style={{ fontSize: "var(--text-label)" }}>
                {changes.length} {changes.length === 1 ? "change" : "changes"}
              </span>
            </div>
            {changes.length === 0 ? (
              <div className="app-review-none">Added to the document — no record changes.</div>
            ) : (
              <ul className="app-review-changes">
                {changes.map((c, i) => (
                  <li key={i} className={c.danger ? "danger" : ""}>
                    <span className={`app-chg-op op-${c.op}`}>
                      <Icon name={OP_ICON[c.op]} size={12} />
                    </span>
                    <span className="app-chg-label">
                      <span className="app-chg-word">{OP_WORD[c.op]}</span> {c.label}
                    </span>
                    {c.danger && (
                      <span className="app-chg-flag" title={c.danger}>
                        <Icon name="alert" size={12} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
