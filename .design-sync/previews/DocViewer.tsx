import { DocViewer } from "@family-archive/ui";

// An offline, self-contained "scanned certificate" so the card never depends on
// the network. A real archive passes a resolved object-storage URL instead.
const SCAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="600" viewBox="0 0 460 600">
  <rect width="460" height="600" fill="#f6efe0"/>
  <rect x="22" y="22" width="416" height="556" fill="none" stroke="#c4b594" stroke-width="2"/>
  <text x="230" y="84" text-anchor="middle" fill="#9a8d77" font-family="Georgia,serif" font-size="13" letter-spacing="3">REGISTER OF BIRTHS</text>
  <text x="230" y="128" text-anchor="middle" fill="#2c2419" font-family="Georgia,serif" font-size="30">Certificate of Birth</text>
  <line x1="60" y1="150" x2="400" y2="150" stroke="#b6a888" stroke-width="2"/>
  <text x="60" y="206" fill="#9a8d77" font-family="Georgia,serif" font-size="11" letter-spacing="2">NAME OF CHILD</text>
  <text x="60" y="230" fill="#3a3226" font-family="Georgia,serif" font-size="20">Eleanor Margaret Whitfield</text>
  <line x1="60" y1="240" x2="400" y2="240" stroke="#cbbda2"/>
  <text x="60" y="296" fill="#9a8d77" font-family="Georgia,serif" font-size="11" letter-spacing="2">DATE OF BIRTH</text>
  <text x="60" y="320" fill="#3a3226" font-family="Georgia,serif" font-size="20">2nd March 1915</text>
  <line x1="60" y1="330" x2="400" y2="330" stroke="#cbbda2"/>
  <text x="60" y="386" fill="#9a8d77" font-family="Georgia,serif" font-size="11" letter-spacing="2">PLACE OF BIRTH</text>
  <text x="60" y="410" fill="#3a3226" font-family="Georgia,serif" font-size="18">14 Wellmeadow Street, Lanark</text>
  <line x1="60" y1="420" x2="400" y2="420" stroke="#cbbda2"/>
  <circle cx="360" cy="510" r="46" fill="none" stroke="#c4b594" stroke-width="2" stroke-dasharray="4 4"/>
  <text x="360" y="514" text-anchor="middle" fill="#9a8d77" font-family="Georgia,serif" font-size="10">SEAL</text>
  <text x="60" y="540" fill="#4a4030" font-family="Georgia,serif" font-size="22" font-style="italic">A. M. Bain</text>
</svg>`;
const SCAN = "data:image/svg+xml;utf8," + encodeURIComponent(SCAN_SVG);

// The viewer fills its (positioned) container — give it a sized stage.
const cropFrame: React.CSSProperties = {
  position: "relative",
  width: 480,
  height: 380,
  maxWidth: "100%",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  overflow: "hidden",
};

export function Certificate() {
  return (
    <div style={cropFrame}>
      <DocViewer resetKey="whitfield-birth-1915" aria-label="Eleanor Whitfield — birth certificate">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SCAN} alt="Eleanor Whitfield — birth certificate" className="fa-docviewer__img" draggable={false} />
      </DocViewer>
    </div>
  );
}
