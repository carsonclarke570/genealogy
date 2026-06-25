import { MediaPreview, Icon } from "@family-archive/ui";

// An offline, self-contained sepia "old photograph" so the card never depends
// on the network. A real archive passes a resolved object-storage URL instead.
const PHOTO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <rect width="320" height="320" fill="#d8c3a5"/>
  <rect x="10" y="10" width="300" height="300" fill="none" stroke="#b69b76" stroke-width="6"/>
  <circle cx="160" cy="132" r="58" fill="#9c8463"/>
  <path d="M70 300c0-58 40-92 90-92s90 34 90 92z" fill="#9c8463"/>
  <rect width="320" height="320" fill="#5a4a32" opacity="0.08"/>
</svg>`;
const PHOTO = "data:image/svg+xml;utf8," + encodeURIComponent(PHOTO_SVG);

const box: React.CSSProperties = {
  width: 200,
  height: 200,
  borderRadius: "var(--radius-md)",
  overflow: "hidden",
  border: "1px solid var(--color-border)",
};
const wrap: React.CSSProperties = { display: "flex", gap: 20, flexWrap: "wrap", padding: 12, alignItems: "flex-start" };
const cap: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: "var(--text-label)", color: "var(--color-muted)", marginTop: 6 };
const phLabel: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  color: "var(--color-muted)", fontFamily: "var(--font-sans)", fontSize: "var(--text-body-sm)",
};

// How an archived file resolves: a photo renders inline, a PDF/fileless record
// lands on a typed placeholder.
export function Gallery() {
  return (
    <div style={wrap}>
      <div>
        <div style={box}>
          <MediaPreview src={PHOTO} mimeType="image/svg+xml" alt="Eleanor Whitfield, c. 1910" variant="thumb" />
        </div>
        <div style={cap}>Photograph · thumb</div>
      </div>
      <div>
        <div style={box}>
          <MediaPreview
            mimeType="application/pdf"
            alt="Birth certificate"
            variant="thumb"
            placeholder={<span style={phLabel}><Icon name="file" size={26} />Certificate · PDF</span>}
          />
        </div>
        <div style={cap}>PDF · placeholder</div>
      </div>
      <div>
        <div style={box}>
          <MediaPreview
            alt="No file attached"
            variant="thumb"
            placeholder={<span style={phLabel}><Icon name="upload" size={26} />No file yet</span>}
          />
        </div>
        <div style={cap}>Fileless record</div>
      </div>
    </div>
  );
}

// `detail` letterboxes the image (contain) for a record dialog.
export function Detail() {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ ...box, width: 280, height: 220 }}>
        <MediaPreview src={PHOTO} mimeType="image/svg+xml" alt="Eleanor Whitfield, c. 1910" variant="detail" />
      </div>
    </div>
  );
}
