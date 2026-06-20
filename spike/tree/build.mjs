// Genealogy layout spike: relatives-tree computes positions + connectors;
// we render with the real design-system tokens (fa-person cards, --edge).
// Output: index.html (screenshot it to validate layout + derive tokens).
import calcTree from "relatives-tree";
import { writeFileSync } from "node:fs";

// --- Sample family: 3 generations, a remarriage + half-siblings ---------
// relatives-tree data is denormalised: every relation is listed on both nodes.
const B = "blood", M = "married", D = "divorced", H = "half";
const nodes = [
  { id: "patrick", gender: "male",   parents: [], siblings: [], spouses: [{ id: "bridget", type: M }], children: [{ id: "eleanor", type: B }, { id: "james", type: B }] },
  { id: "bridget", gender: "female", parents: [], siblings: [], spouses: [{ id: "patrick", type: M }], children: [{ id: "eleanor", type: B }, { id: "james", type: B }] },

  { id: "eleanor", gender: "female", parents: [{ id: "patrick", type: B }, { id: "bridget", type: B }], siblings: [{ id: "james", type: B }], spouses: [{ id: "thomas", type: M }], children: [{ id: "aoife", type: B }, { id: "sean", type: B }] },
  { id: "james",   gender: "male",   parents: [{ id: "patrick", type: B }, { id: "bridget", type: B }], siblings: [{ id: "eleanor", type: B }], spouses: [{ id: "mary", type: M }], children: [{ id: "colm", type: B }] },
  { id: "thomas",  gender: "male",   parents: [], siblings: [], spouses: [{ id: "eleanor", type: M }, { id: "margaret", type: D }], children: [{ id: "aoife", type: B }, { id: "sean", type: B }, { id: "liam", type: B }] },
  { id: "margaret",gender: "female", parents: [], siblings: [], spouses: [{ id: "thomas", type: D }], children: [{ id: "liam", type: B }] },
  { id: "mary",    gender: "female", parents: [], siblings: [], spouses: [{ id: "james", type: M }], children: [{ id: "colm", type: B }] },

  { id: "aoife", gender: "female", parents: [{ id: "eleanor", type: B }, { id: "thomas", type: B }], siblings: [{ id: "sean", type: B }, { id: "liam", type: H }], spouses: [], children: [] },
  { id: "sean",  gender: "male",   parents: [{ id: "eleanor", type: B }, { id: "thomas", type: B }], siblings: [{ id: "aoife", type: B }, { id: "liam", type: H }], spouses: [], children: [] },
  { id: "liam",  gender: "male",   parents: [{ id: "thomas", type: B }, { id: "margaret", type: B }], siblings: [{ id: "aoife", type: H }, { id: "sean", type: H }], spouses: [], children: [] },
  { id: "colm",  gender: "male",   parents: [{ id: "james", type: B }, { id: "mary", type: B }], siblings: [], spouses: [], children: [] },
];

const display = {
  patrick: ["Patrick Whitfield", "1858", "1929"],
  bridget: ["Bridget Lynch", "1860", "1921"],
  eleanor: ["Eleanor Whitfield", "1888", "1971"],
  james: ["James Whitfield", "1890", "1953"],
  thomas: ["Thomas Reardon", "1885", "1959"],
  margaret: ["Margaret Doyle", "1887", "1970"],
  mary: ["Mary Brennan", "1894", "1962"],
  aoife: ["Aoife Reardon", "1913", "1998"],
  sean: ["Seán Reardon", "1916", "1990"],
  liam: ["Liam Reardon", "1908", "1981"],
  colm: ["Colm Whitfield", "1919", "2001"],
  hasDocs: { eleanor: true, thomas: true, aoife: true },
};

const initials = (n) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

// --- Layout -------------------------------------------------------------
const data = calcTree(nodes, { rootId: "patrick" });

// Pixels per unit = node-dimension / 2 (relatives-tree's SIZE=2 grid).
const NODE_W = 240, NODE_H = 84;
const px = (u, dim) => u * (dim / 2);
const W = px(data.canvas.width, NODE_W);
const Hpx = px(data.canvas.height, NODE_H);

const nodeHtml = data.nodes.map((n) => {
  const [name, birth, death] = display[n.id];
  const docs = display.hasDocs[n.id];
  return `<div class="node" style="transform:translate(${px(n.left, NODE_W)}px,${px(n.top, NODE_H)}px)">
    <button class="fa-person">
      <span class="fa-avatar fa-avatar--md"><span>${initials(name)}</span></span>
      <span class="fa-person__body">
        <span class="fa-person__name">${name}</span>
        <span class="fa-person__dates">${birth} – ${death}</span>
      </span>
      ${docs ? '<span class="fa-person__docdot"></span>' : ""}
    </button>
  </div>`;
}).join("\n");

const connHtml = data.connectors.map(([x1, y1, x2, y2]) => {
  const X1 = px(x1, NODE_W), Y1 = px(y1, NODE_H), X2 = px(x2, NODE_W), Y2 = px(y2, NODE_H);
  return `<line x1="${X1}" y1="${Y1}" x2="${X2}" y2="${Y2}" />`;
}).join("\n");

const html = `<!doctype html><html><head><meta charset="utf8">
<link rel="stylesheet" href="../../dist/family-archive.css">
<style>
  body { margin:0; background:var(--color-bg); }
  .stage { position:relative; padding:48px; }
  .canvas { position:relative; width:${W}px; height:${Hpx}px; }
  .canvas svg { position:absolute; inset:0; overflow:visible; pointer-events:none; }
  .canvas line { stroke:var(--edge); stroke-width:var(--edge-width); }
  .node { position:absolute; top:0; left:0; width:${NODE_W}px; height:${NODE_H}px; display:flex; }
  .node .fa-person { max-width:none; }
</style></head>
<body><div class="stage"><div class="canvas">
  <svg width="${W}" height="${Hpx}">${connHtml}</svg>
  ${nodeHtml}
</div></div></body></html>`;

writeFileSync(new URL("./index.html", import.meta.url), html);
console.log(`canvas: ${data.canvas.width}x${data.canvas.height} units → ${W}x${Hpx}px`);
console.log(`nodes: ${data.nodes.length}, connectors: ${data.connectors.length}`);
