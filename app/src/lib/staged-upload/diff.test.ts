import { describe, it, expect } from "vitest";
import { seedFromPerson, syntheticPerson, blankItem, model, type CollectionModel } from "./registry";
import { buildSubjectPayload, subjectChanges, valEq } from "./diff";
import type { RecordChange } from "./payload";
import { makeFixture, makeCtx, yearDate } from "./fixtures";

const d = makeFixture();
const ctx = makeCtx(d);

function changes(personId: string, mutate: (draft: ReturnType<typeof seedFromPerson>) => void) {
  const person = d.people[personId];
  const draft = seedFromPerson(d, person);
  mutate(draft);
  return subjectChanges(person, draft, ctx);
}

describe("diff.valEq", () => {
  it("compares partial dates by component", () => {
    expect(valEq(yearDate(1915), yearDate(1915))).toBe(true);
    expect(valEq(yearDate(1915), yearDate(1916))).toBe(false);
  });
  it("compares locations by label and treats null/empty alike", () => {
    expect(valEq({ label: "Boston" }, { label: "Boston" })).toBe(true);
    expect(valEq(null, "")).toBe(true);
  });
});

describe("diff person model", () => {
  it("emits no change when nothing is edited", () => {
    expect(changes("P1", () => {})).toHaveLength(0);
  });

  it("extracts a surname edit as a verified set-field, flagged danger", () => {
    const out = changes("P1", (draft) => {
      draft.leaves["person.surname"] = "Reed";
    });
    expect(out).toHaveLength(1);
    expect(out[0].change).toMatchObject({ model: "person", op: "set-field", field: "surname", value: "Reed" });
    expect(out[0].danger).toBeTruthy(); // surname change warns
  });

  it("maps the living select to a boolean and flags it", () => {
    const out = changes("P1", (draft) => {
      draft.leaves["person.living"] = "deceased";
    });
    expect(out[0].change).toMatchObject({ model: "person", field: "living", value: false });
    expect(out[0].danger).toBeTruthy();
  });
});

describe("diff life model", () => {
  it("serialises a birth date edit and warns on a year change", () => {
    const out = changes("P1", (draft) => {
      draft.leaves["life.birth.date"] = yearDate(1916);
    });
    expect(out[0].change).toMatchObject({ model: "life", field: "bornDate", value: "1916" });
    expect(out[0].danger).toBeTruthy();
  });

  it("passes a birth place edit through as a location", () => {
    const out = changes("P1", (draft) => {
      draft.leaves["life.birth.place"] = { label: "Lanark, Scotland" };
    });
    const c = out[0].change as Extract<RecordChange, { model: "life" }>;
    expect(c.field).toBe("bornPlace");
    expect(c.value).toMatchObject({ label: "Lanark, Scotland" });
  });
});

describe("diff collections", () => {
  it("extracts a new relationship as add-item with an existing pointer", () => {
    const out = changes("P1", (draft) => {
      const m = model("rels") as CollectionModel;
      const it = blankItem(m);
      it.type = "child";
      it.person = "P3";
      draft.rels.push(it);
    });
    const add = out.find((c) => c.op === "add" && c.modelKey === "rels");
    expect(add?.change).toMatchObject({ model: "rels", op: "add-item", data: { type: "child", target: { ref: "existing", id: "P3" } } });
  });

  it("removing an existing residence is a remove-item carrying its real id", () => {
    const out = changes("P1", (draft) => {
      draft.residences[0]._removed = true;
    });
    const rm = out.find((c) => c.modelKey === "residences");
    expect(rm?.op).toBe("remove");
    expect(rm?.change).toMatchObject({ model: "residences", op: "remove-item", itemId: "RES1" });
  });

  it("editing an existing residence is an update-item", () => {
    const out = changes("P1", (draft) => {
      draft.residences[0].note = "Family home";
    });
    const up = out.find((c) => c.modelKey === "residences");
    expect(up?.op).toBe("update");
    expect(up?.change).toMatchObject({ op: "update-item", itemId: "RES1" });
  });

  it("ignores a blank new collection item with no content", () => {
    const out = changes("P1", (draft) => {
      const m = model("events") as CollectionModel;
      draft.events.push(blankItem(m));
    });
    expect(out.filter((c) => c.modelKey === "events")).toHaveLength(0);
  });
});

describe("diff with a new subject", () => {
  it("resolves a connection to another new subject as a temp pointer", () => {
    const spec = { tempId: "new-9", given: "Baby", surname: "Whitfield", sex: "f" as const, bornYear: 1940 };
    const person = syntheticPerson(spec);
    const draft = seedFromPerson(d, person); // synthetic person → empty collections
    const m = model("rels") as CollectionModel;
    const it = blankItem(m);
    it.type = "parent";
    it.person = "new-other"; // a temp id not in the archive
    draft.rels.push(it);
    const ctxWithNew = { ...ctx, isExisting: (id: string) => !!d.people[id] };
    const out = buildSubjectPayload({ kind: "new", spec }, person, draft, ctxWithNew);
    expect(out.ref).toMatchObject({ kind: "new", spec: { tempId: "new-9" } });
    const add = out.changes.find((c) => c.model === "rels");
    expect(add).toMatchObject({ op: "add-item", data: { target: { ref: "temp", id: "new-other" } } });
  });
});
