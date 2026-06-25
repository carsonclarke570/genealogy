---
category: Data Display
---

AvatarStack — a row of overlapping avatars for "the people involved".

Each avatar overlaps the previous and wears a surface-coloured ring so the
group reads as one cluster, with the name on a Tooltip. Use it wherever a
fact touches several people (a timeline event, a shared document); pair it
with a names label when you want the full list spelled out. Items become
buttons when given an `onClick`.

## Props

```ts
interface AvatarStackProps {
  items: AvatarStackItem[];
  /** How many avatars to show before stopping. */
  max?: number;
  /** Avatar size. */
  size?: "sm" | "md" | "lg";
}
```
