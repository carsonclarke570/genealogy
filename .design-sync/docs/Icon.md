---
category: Data Display
---

Icon — the stroke-glyph rendering primitive.

Draws a single-path, 24×24, `currentColor` stroke icon at the given size, so
a glyph inherits the surrounding text colour. Pass a `name` from the shared
set, or a `path` for an app-specific glyph — the SVG boilerplate (viewBox,
stroke, line caps) lives here, once.

@example
<Icon name="search" />
<Icon path={APP_GLYPHS.tree} size={20} aria-label="Family tree" />

## Props

```ts
interface IconProps {
  /** A glyph from the shared {@link GLYPHS} set. */
  name?: "search" | "plus" | "edit" | "close" | "zoomIn" | "zoomOut" | "recenter" | "chevron" | "sun" | "moon" | "upload" | "download" | "trash" | "file" | "dots" | "check" | (string & {}) /* +18 more */;
  /** A raw 24×24 path, for a consumer's own glyph (takes precedence over `name`). */
  path?: string;
  /** Pixel box (width = height). */
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  /** Accessible name. When set the icon is exposed as `img`; otherwise it's `aria-hidden` (decorative — the default, since mo */
  "aria-label"?: string;
}
```

## Related

`IconBadge`, `IconButton`
