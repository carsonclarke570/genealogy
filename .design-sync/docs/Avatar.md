---
category: Data Display
---

Avatar — a round portrait with a monogram fallback.

When no `src` is given (or the image errors), it renders the person's initials
on a quiet sunken surface, so a person without a photo still reads as a person,
not a broken image. Used inside PersonNode and record headers.

@example
<Avatar name="Eleanor Whitfield" src="/media/eleanor.jpg" size="lg" />
<Avatar name="Thomas Reardon" /> // monogram fallback

## Props

```ts
interface AvatarProps {
  /** Portrait image URL. When absent or it fails to load, a monogram is shown. */
  src?: string;
  /** Full name — used for the image alt text and to derive the monogram. */
  name: string;
  /** Diameter preset. */
  size?: "sm" | "md" | "lg";
  className?: string;
  id?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}
```

## Related

`AvatarStack`
