---
category: Navigation
---

Breadcrumb — hierarchical / lineage navigation.

Genealogy is deeply hierarchical, so an ancestor chain is a primary movement
(e.g. Tree › Whitfield line › Eleanor › Aoife). The last crumb is the current
location (`aria-current="page"`, not a link); the rest are links.

@example
<Breadcrumb items={[
  { label: "Family tree", href: "/tree" },
  { label: "Eleanor Whitfield", href: "/p/eleanor" },
  { label: "Aoife Reardon" },
]} />

## Props

```ts
interface BreadcrumbProps {
  /** The ancestor chain, root → current; the last item renders as the current page. */
  items: Crumb[];
  /** Accessible label for the nav landmark. */
  ariaLabel?: string;
}
```
