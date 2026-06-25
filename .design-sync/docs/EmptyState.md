---
category: Feedback & Overlays
---

EmptyState — what a surface shows before it has content.

Teaches the interface rather than saying "nothing here": a calm icon, a plain
title, one guiding sentence, and the action that fills the void. Centered,
generous spacing. Use for an empty tree, a person with no documents, or
no search results.

@example
<EmptyState
  icon={<TreeIcon />}
  title="No people yet"
  description="Add the first person to begin building your family tree."
  action={<Button variant="primary">Add person</Button>}
/>

## Props

```ts
interface EmptyStateProps {
  /** Optional icon/illustration shown above the title. */
  icon?: React.ReactNode;
  /** The headline — say what's missing, plainly. */
  title: React.ReactNode;
  /** A sentence that teaches the next step. */
  description?: React.ReactNode;
  /** Primary action (e.g. an "Add person" Button). */
  action?: React.ReactNode;
}
```
