import type { CSSProperties } from "react";

/** App-chrome glyphs (navigation, canvas controls). Record/provenance marks come
 *  from the design system's ProvenanceMark; these are the surrounding furniture. */
const PATHS: Record<string, string> = {
  tree: "M12 3v4M12 17v4M5 7h14M5 7a2 2 0 100-1.9M19 7a2 2 0 100-1.9M12 11a2 2 0 100-1.9M6 21a2 2 0 100-1.9M18 21a2 2 0 100-1.9M6 19v-4h12v4M12 13v-2",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  gallery: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M8 9a1.5 1.5 0 100-1.9",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  close: "M6 6l12 12M18 6L6 18",
  zoomIn: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M11 8v6M8 11h6",
  zoomOut: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M8 11h6",
  recenter: "M12 3v3M12 18v3M3 12h3M18 12h3M12 16a4 4 0 100-8 4 4 0 000 8z",
  chevron: "M9 6l6 6-6 6",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4 4l1.5 1.5M18.5 18.5L20 20M1 12h2M21 12h2M4 20l1.5-1.5M18.5 5.5L20 4",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 109.8 9.8z",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  dots: "M5 12a1 1 0 100-.1M12 12a1 1 0 100-.1M19 12a1 1 0 100-.1",
  check: "M4 12l5 5L20 7",
  wave: "M3 13c1.6-3 4.4-3 6 0s4.4 3 6 0",
  alert: "M12 4l9 16H3zM12 10v4M12 17.4v.2",
  ring: "M12 19a7 7 0 100-14 7 7 0 000 14z",
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}
