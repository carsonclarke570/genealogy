import type { CSSProperties } from "react";
import { Icon as UIIcon, GLYPHS } from "@family-archive/ui";

/** App-chrome glyphs that aren't part of the shared design-system set: the
 *  family-tree and gallery nav marks. Everything else (controls + life-event
 *  glyphs) comes from the design system's GLYPHS, rendered through its Icon. */
const APP_GLYPHS = {
  tree: "M12 3v4M12 17v4M5 7h14M5 7a2 2 0 100-1.9M19 7a2 2 0 100-1.9M12 11a2 2 0 100-1.9M6 21a2 2 0 100-1.9M18 21a2 2 0 100-1.9M6 19v-4h12v4M12 13v-2",
  gallery: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M8 9a1.5 1.5 0 100-1.9",
  // Folded map with route fold lines — the Family Map nav mark.
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
} as const;

const PATHS = { ...GLYPHS, ...APP_GLYPHS };

export type IconName = keyof typeof PATHS;

/** Thin wrapper over the design-system Icon: resolves an app glyph name to its
 *  path and delegates the SVG rendering. */
export function Icon({
  name,
  size = 18,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return <UIIcon path={PATHS[name]} size={size} style={style} />;
}
