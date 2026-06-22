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
  // timeline / life-event glyphs (ported from the design system's icon set)
  calendar: "M5 5h14v15H5zM5 10h14M9 3v3M15 3v3M8 14h2M12 14h2",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7.5V12l3 2",
  sliders: "M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1M13 5v4M7 10v4M15 15v4",
  pin: "M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 10-13 0C5.5 15.4 12 21 12 21zM12 12.5a2 2 0 100-4 2 2 0 000 4z",
  link: "M9.5 13.5a4 4 0 005.6 0l2.4-2.4a4 4 0 00-5.6-5.6l-1 1M14.5 10.5a4 4 0 00-5.6 0l-2.4 2.4a4 4 0 005.6 5.6l1-1",
  birth: "M12 21v-8M12 13c0-3.3 2.2-5.5 5.5-5.5 0 3.3-2.2 5.5-5.5 5.5zM12 13c0-3.3-2.2-5.5-5.5-5.5 0 3.3 2.2 5.5 5.5 5.5z",
  death: "M5 20c0-7.5 5.5-13.5 14-14.5C18 13 12.5 19 5 20zM5 20c3-4.5 6.5-7 10.5-8.5",
  heart: "M12 20S4 14.6 4 9.2A3.7 3.7 0 0112 6.6 3.7 3.7 0 0120 9.2C20 14.6 12 20 12 20z",
  divorce: "M11 7H8.5a4 4 0 000 8H11M13 17h2.5a4 4 0 000-8H13M12 4l-1.5 4M12 20l1.5-4",
  ship: "M5 17h14l-2 4H7zM7 17V9l5-2 5 2v8M12 4v3M9.5 17v-5M14.5 17v-5",
  shield: "M12 3l7 2.5v5.5c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V5.5z",
  cap: "M12 4L2 9l10 5 10-5zM6 11v5c0 1.2 3 2.6 6 2.6s6-1.4 6-2.6v-5M21 9.5v5",
  briefcase: "M4 8h16v11H4zM9 8V6.2A2.2 2.2 0 0111.2 4h1.6A2.2 2.2 0 0115 6.2V8M4 13h16",
  home: "M4 11l8-7 8 7M6 10v9h12v-9M10 19v-5h4v5",
  church: "M12 3v4M9.6 5.4h4.8M6 21v-9l6-3.6 6 3.6v9M9.5 21v-3.5a2.5 2.5 0 015 0V21M4 21h16",
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
